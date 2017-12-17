import './index.css'
import * as THREE from 'three';
import * as WHS from 'whs'
import dat from 'dat.gui/build/dat.gui.js'
import Alea from 'alea'
import { Easing, Tween, autoPlay } from 'es6-tween'

// import './modules/terrain.js'
import DragControls from './modules/DragControls'
import FlyControls from './modules/FlyControls'
import SimplexNoise from './modules/simplexNoise'
import StatsModule from './modules/StatsModule'
import {initSky} from './sky'
import keyboardJS from 'keyboardjs'
import {buildTile, buildPlane, spectralMaterial, heightmap} from './terrain'

const container = document.getElementById('root')
const cameraModule = new WHS.DefineModule(
  'camera',
  new WHS.PerspectiveCamera({ // Apply a camera.
    position: new THREE.Vector3(0, -500, 450),
    far: 1e6,
  })
)
const fogModule = new WHS.FogModule({
  color: 0xffffff,
  density: 0.03,
  near: 20,
  far: 200
}, 'exp2');
window.THREE = THREE

const flyModule = new WHS.ControlsModule.from(new FlyControls(cameraModule.data.native))
const orbitModule = new WHS.OrbitControlsModule()
let controlsModule = orbitModule

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
  new WHS.ResizeModule()
]);
window.app = app
const gui = new dat.GUI()
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

initSky(app.get('scene'), gui)

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
    lastCameraPosition = cameraPosition.clone()

    var vector = new THREE.Vector3();
    const camVec = terrainTarget.native.getWorldDirection( vector );
    let targetPosition = cameraPosition.clone()

    targetPosition = targetPosition.add(camVec.multiplyScalar(400 * Math.max(1, Math.abs(cameraPosition.z) / 400)))
    drone.position.set(targetPosition.x, targetPosition.y, 0)
    // if (app.manager.modules.controls.controls.target) {
    //   app.manager.modules.controls.controls.target.setZ(0)
    // }


    const z0 = 10
    const zoomDelta = Math.min(7, Math.floor(Math.sqrt(Math.abs(cameraPosition.z)) / 28))
    // const zoomDelta = 0
    const zoom = z0 - zoomDelta
    const currentTileSize = tileSize * Math.pow(2, zoomDelta)

    const x0 = Math.round(targetPosition.x / currentTileSize)
    const y0 = -Math.round(targetPosition.y / currentTileSize)

    const segments0 = cameraPosition.z > 2000 ? 127 : 255
    const segments1 = cameraPosition.z > 2000 ? 31 : 63
    // const segments0 = 32
    // const segments1 = 15
    const segments2 = 15

    let visibleKeysArray = [
        [zoom, x0,     y0    , segments0, 0, currentTileSize],
        [zoom, x0,     y0 + 1, segments0, 0, currentTileSize],
        [zoom, x0 + 1, y0    , segments0, 0, currentTileSize],
        [zoom, x0 + 1, y0 + 1, segments0, 0, currentTileSize],

        [zoom, x0 - 1, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 - 0, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 + 1, segments1, 0, currentTileSize],
        [zoom, x0 - 1, y0 + 2, segments1, 0, currentTileSize],

        [zoom, x0 + 2, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 + 2, y0 - 0, segments1, 0, currentTileSize],
        [zoom, x0 + 2, y0 + 1, segments1, 0, currentTileSize],
        [zoom, x0 + 2, y0 + 2, segments1, 0, currentTileSize],

        [zoom, x0    , y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0    , y0 + 2, segments1, 0, currentTileSize],
        [zoom, x0 + 1, y0 - 1, segments1, 0, currentTileSize],
        [zoom, x0 + 1, y0 + 2, segments1, 0, currentTileSize],

        // [zoom, x0 - 2, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 - 1, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 - 0, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 + 1, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 + 2, segments2, 0, currentTileSize],
        // [zoom, x0 - 2, y0 + 3, segments2, 0, currentTileSize],

        // [zoom, x0 + 3, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 - 1, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 - 0, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 + 1, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 + 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 3, y0 + 3, segments2, 0, currentTileSize],

        // [zoom, x0 - 1, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 - 1, y0 + 3, segments2, 0, currentTileSize],
        // [zoom, x0    , y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0    , y0 + 3, segments2, 0, currentTileSize],
        // [zoom, x0 + 1, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 1, y0 + 3, segments2, 0, currentTileSize],
        // [zoom, x0 + 2, y0 - 2, segments2, 0, currentTileSize],
        // [zoom, x0 + 2, y0 + 3, segments2, 0, currentTileSize],

    ]

    // let camera = terrainTarget.native
    // // camera.updateMatrix(); // make sure camera's local matrix is updated
    // // camera.updateMatrixWorld(); // make sure camera's world matrix is updated
    // // camera.matrixWorldInverse.getInverse( camera.matrixWorld );
    // var frustum = new THREE.Frustum();
    // frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    // console.log( frustum );

    const visibleKeysString = visibleKeysArray.map(k => k.toString())
    const currentKeysString = currentKeysArray.map(k => k.toString())
    const newKeys = visibleKeysString.filter(x => currentKeysString.indexOf(x) < 0)
    const oldKeys = currentKeysString.filter(x => visibleKeysString.indexOf(x) < 0)

    // if (oldKeys) {console.log('deleting', oldKeys.sort())}
    // if (newKeys) {console.log('adding', newKeys.sort())}

    newKeys.map(newKey => {
      const zxyijs = newKey.split(',').map(x => parseInt(x))
      const plane = buildPlane(...zxyijs)
    })
    const deleteTile = (tile) => {
      app.get('scene').remove(tile)
      tile.geometry.dispose()
      tile.geometry = null
      tile.material.uniforms.heightmap.value.dispose()
      tile.material.dispose()
      tile.material = null
    }
    app.get('scene').children.filter(
      child => child.key && visibleKeysString.indexOf(child.key) < 0
    ).map(
      tile => {
        if (!tile.markedForDeletion) {
          new Promise((resolve) => window.setTimeout(() => deleteTile(tile), 750))
          tile.markedForDeletion = true
        }
      }
    )

    currentKeysArray = visibleKeysArray.slice(0)

  }
})
app.addLoop(tileBuilder)
tileBuilder.start()

// const gridHelper = new THREE.GridHelper( 1000, 10 )
// gridHelper.geometry.rotateX(Math.PI / 2)
// gridHelper.position.z = 100
// app.get('scene').add( gridHelper)
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
  if (controlsModule === orbitModule) {
    console.log(controlsModule)
    let cam = drone.position.clone()
    const target = orbitModule.controls.target
    let tween = new Tween({x: target.x, y: target.y, z: target.z})
      .to({ x: cam.x, y: cam.y + 1000, z: 0 }, 1000)
      .on('update', ({x, y, z}) => {
        orbitModule.controls.target.set(x, y, z)
        orbitModule.controls.update()
      })
      .start();
    console.log(tween)
  }
  app.applyModule(controlsModule)
  toggleControls(controlsModule, true)
  console.log("apply", controlsModule)
})
// keyboardJS.watch()

keyboardJS.bind('c', e => {
  console.log(app.get('camera').position)
})

keyboardJS.bind('r', e => {
  const autoRotate = app.manager.modules.controls.controls.autoRotate
  app.manager.modules.controls.controls.autoRotate = !autoRotate
})

const scene = app.get('scene')

autoPlay(true)

export {scene}