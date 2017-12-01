import './index.css'
import * as THREE from 'three';
import * as WHS from 'whs'
import DatGUIModule from 'whs/modules/DatGUIModule'
import Alea from 'alea'
// import './modules/terrain.js'
import DragControls from './modules/DragControls'
import FlyControls from './modules/FlyControls'
import SimplexNoise from './modules/simplexNoise'
import StatsModule from './modules/StatsModule'
import keyboardJS from 'keyboardjs'
import {buildTile, buildPlane, spectralMaterial, heightmap} from './terrain'

const container = document.getElementById('root')
const cameraModule = new WHS.DefineModule(
  'camera',
  new WHS.PerspectiveCamera({ // Apply a camera.
    position: new THREE.Vector3(0, -10, 150),
    far: 1e6,
  })
)
const fogModule = new WHS.FogModule({
  color: 0xffffff,
  density: 0.03,
  near: 20,
  far: 200
}, 'exp2');

const flyModule = new WHS.ControlsModule.from(new FlyControls(cameraModule.data.native))
const orbitModule = new WHS.OrbitControlsModule()
let controlsModule = flyModule

window.WHS = WHS
window.THREE = THREE
window.cameraModule = cameraModule
window.SimplexNoise = SimplexNoise

const app = new WHS.App([
  new WHS.ElementModule({
    container
  }),
  new WHS.SceneModule(),
  cameraModule,
  new WHS.RenderingModule({
    bgColor: 0x162129,

    renderer: {
      antialias: true,
      shadowmap: {
        type: THREE.PCFSoftShadowMap,
        enable: true
      }
    }
  }, {shadow: true}),
  // fogModule,
  controlsModule,
  new StatsModule(0),
  new DatGUIModule(),
  new WHS.ResizeModule()
]);
window.app = app
const gui = app.manager.modules["gui/dat.gui"].gui
window.gui = gui

console.log(app.get('camera'))
app.get('camera').native.up = new THREE.Vector3(0, 0, 1)
app.get('camera').native.lookAt({x: 0, y: 0, z: 0})
// Plane

const drone = new WHS.Sphere({
  geometry: {radius: 5},
  position: {x:0, y:0, z: 30},
  material: new THREE.MeshBasicMaterial({
    color: 0xffffff
  }),
})
drone.addTo(app)
window.drone = drone
const dragControls = new DragControls([drone.native], cameraModule.data.native, container)
dragControls.addEventListener( 'dragstart', event => {
  toggleControls(controlsModule, false)
});
dragControls.addEventListener( 'dragend', event => {
  toggleControls(controlsModule, true)
});
const dragModule = new WHS.ControlsModule.from(dragControls)


const xToTile = x => {
  return Math.floor((x + 50) / 800 + 330 / 4)
}

const yToTile = y => {
  return Math.floor((-y + 50) / 800 + 790 / 4)
}

const tileToX = x0 => (x0 - 330 / 4) * 800
const tileToY = y0 => (y0 - 790 / 4) * 800


const distanceToCamera = key => {
  const xy = new THREE.Vector3(
    tileToX(key[1]) + (key[3] + 0.5) * key[5],
    tileToY(key[2]) + (key[4] + 0.5) * key[5],
    0
  )
  const cameraPosition = app.get('camera').position
  return 32
  return Math.min(
    Math.floor(32 * 200 / xy.distanceTo(cameraPosition) * key[5] / 100),
    32
  )
}

const calibrate = key => {
  const segments = 32
  return [...key, distanceToCamera(key)]
}


let lastCameraPosition = new THREE.Vector3(0, 0, 0)
let tiles = {}
let pngs = {}
let currentKeysArray = []
window.tiles = tiles
window.pngs = pngs

// const plane = new WHS.Plane({
//     geometry: {
//       width: 800,
//       height: 800,
//       wSegments: 127,
//       hSegments: 127,
//       buffer: true
//     },
//     position: new THREE.Vector3(0, 0, 0),
//     material: spectralMaterial(),
//   })
const tileSize = 800
const material = spectralMaterial()

// const terrainTarget = drone
const terrainTarget = app.get('camera')
window.camera = terrainTarget


const tileBuilder = new WHS.Loop((clock) => {
  // if (clock.getElapsedTime() < 1) {console.log(clock)}
  const cameraPosition = terrainTarget.position
  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    console.log(cameraPosition)
    lastCameraPosition = cameraPosition.clone()

    var vector = new THREE.Vector3();
    const camVec = terrainTarget.native.getWorldDirection( vector );
    console.log(camVec)
    let targetPosition = cameraPosition.clone()

    targetPosition = targetPosition.add(camVec.multiplyScalar(400 * Math.max(1, cameraPosition.z / 400)))
    drone.position.set(targetPosition.x, targetPosition.y, 0)


    const z0 = 10
    const zoomDelta = Math.min(8, Math.floor(Math.sqrt(cameraPosition.z) / 28))
    const zoom = z0 - zoomDelta
    const currentTileSize = 800 * Math.pow(2, zoomDelta)

    const x0 = Math.round(targetPosition.x / currentTileSize)
    const y0 = -Math.round(targetPosition.y / currentTileSize)
    const segments0 = targetPosition.z > 3000 ? 127 : 255
    const segments1 = targetPosition.z > 3000 ? 63 : 127
    const segments2 = 31

    let visibleKeysArray = [
        [zoom, x0, y0, segments0, 0, currentTileSize],
        [zoom, x0 - 1, y0, segments1, 0, currentTileSize],
        [zoom, x0 + 1, y0, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 + 1, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 + 1, segments1, 0, currentTileSize],
        [zoom, x0, y0 + 1, segments1, 0, currentTileSize],
        [zoom, x0 + 1, y0 + 1, segments1, 0, currentTileSize],
    ]
    // for (let i=0; i < 8; i++) {
    //   for (let j=0; j < 8; j++) {
      // const i = 0
      // const j = 0
      //   visibleKeysArray.push([z0 + 1, 2 * x0, 2* y0, i, j, 400])
      //   visibleKeysArray.push([z0 + 1, 2 * x0 + 1, 2* y0, i, j, 400])
      //   visibleKeysArray.push([z0 + 1, 2 * x0, 2* y0 + 1, i, j, 400])
      //   visibleKeysArray.push([z0 + 1, 2 * x0 + 1, 2* y0 + 1, i, j, 400])
    //   }
    // }
    // // z0 = 10
    // // const x0_11 = Math.floor(x0 / 2)
    // // const y0_11 = Math.floor(y0 / 2)
    // // visibleKeysArray = visibleKeysArray.concat([
    // //   [z0, x0_11 - 1, y0_11 - 1],
    // //   [z0, x0_11 - 1, y0_11],
    // //   [z0, x0_11 - 1, y0_11 + 1],
    // //   [z0, x0_11, y0_11 - 1],
    // //   // [z0, x0_11, y0_11],
    // //   [z0, x0_11, y0_11 + 1],
    // //   [z0, x0_11 + 1, y0_11 - 1],
    // //   [z0, x0_11 + 1, y0_11],
    // //   [z0, x0_11 + 1, y0_11 + 1],
    // // ])

    // let camera = terrainTarget.native
    // // camera.updateMatrix(); // make sure camera's local matrix is updated
    // // camera.updateMatrixWorld(); // make sure camera's world matrix is updated
    // // camera.matrixWorldInverse.getInverse( camera.matrixWorld );
    // var frustum = new THREE.Frustum();
    // frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    // console.log( frustum );

    // visibleKeysArray = visibleKeysArray.map(key => calibrate(key))

    const visibleKeysString = visibleKeysArray.map(k => k.toString())
    const currentKeysString = currentKeysArray.map(k => k.toString())
    const newKeys = visibleKeysString.filter(x => currentKeysString.indexOf(x) < 0)
    const oldKeys = currentKeysString.filter(x => visibleKeysString.indexOf(x) < 0)

    if (oldKeys) {console.log('deleting', oldKeys)}
    if (newKeys) {console.log('adding', newKeys)}

    oldKeys.forEach(x => {
      tiles[x].geometry.dispose()
      tiles[x].geometry = null
      tiles[x].material.dispose()
      tiles[x].material = null
      app.remove(tiles[x])
      app.children = app.children.filter(child => child !== tiles[x])
      app.get('scene').remove(tiles[x]) 
      delete tiles[x]
    })
    newKeys.forEach(k => {
      const zxyijs = k.split(',').map(x => parseInt(x))
      tiles[k] = buildPlane(...zxyijs)
      app.get('scene').add(tiles[k])

      // const options = {}
      // tiles[k] = buildTile(...zxyijs, 32, options)
      // tiles[k].addTo(app)
    })

    currentKeysArray = visibleKeysArray.slice(0)

  }
})
app.addLoop(tileBuilder)
tileBuilder.start()

const gridHelper = new THREE.GridHelper( 1000, 10 )
gridHelper.geometry.rotateX(Math.PI / 2)
gridHelper.position.z = 100
app.get('scene').add( gridHelper)
// const camera2 = new WHS.PerspectiveCamera().copy(app.get('camera'))
// camera2.position.copy(drone.position)
// console.log(camera2)
// app.get('scene').add(new THREE.CameraHelper(camera2.native))


// const rotateDrone = new WHS.Loop((clock) => {
//   const r = 100
//   const t = clock.getElapsedTime()
//   drone.position = {x: r * Math.cos(t), y: r * Math.sin(t), z: 30}
// });
// app.addLoop(rotateDrone)
// // rotateDrone.start()

// Lights
new WHS.PointLight({
  light: {
    intensity: 1,
    distance: 100
  },

  shadow: {
    fov: 90
  },

  position: new THREE.Vector3(0, 10, 20)
}).addTo(app);

new WHS.AmbientLight({
  light: {
    intensity: 0.4
  }
}).addTo(app);

new WHS.HemisphereLight({ 
  skyColor: 0xff0000,
  groundColor: 0x0000ff,
  intensity: 0.2
}).addTo(app);

// Start the app
app.start();

const toggleControls = (module, state) => {
  state = state !== undefined ? state : module.controls.enabled
  module.controls.enabled = state
  module.updateLoop.enabled = state
}

keyboardJS.bind('p', e => {
  app.disposeModule(controlsModule)
  console.log("disposed", controlsModule)
  toggleControls(controlsModule, false)
  controlsModule = controlsModule === orbitModule ? flyModule : orbitModule
  app.applyModule(controlsModule)
  toggleControls(controlsModule, true)
  console.log("apply", controlsModule)
})
// keyboardJS.watch()

keyboardJS.bind('c', e => {
  console.log(app.get('camera').position)
})
