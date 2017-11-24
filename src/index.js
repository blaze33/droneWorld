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
import {buildTile} from './terrain/index'
import vertexShader from './terrain/shaders/terrain.vert'
import fragmentShader from './terrain/shaders/terrain.frag'

const container = document.getElementById('root')
const cameraModule = new WHS.DefineModule(
  'camera',
  new WHS.PerspectiveCamera({ // Apply a camera.
    position: new THREE.Vector3(0, 0, 300),
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
// Plane

// const drone = new WHS.Sphere({
//   geometry: {radius: 5},
//   position: {x:0, y:0, z: 30},
//   material: new THREE.MeshBasicMaterial({
//     color: 0xffffff
//   }),
// })
// drone.addTo(app)
// window.drone = drone
// const dragControls = new DragControls([drone.native], cameraModule.data.native, container)
// dragControls.addEventListener( 'dragstart', event => {
//   toggleControls(controlsModule, false)
// });
// dragControls.addEventListener( 'dragend', event => {
//   toggleControls(controlsModule, true)
// });
// const dragModule = new WHS.ControlsModule.from(dragControls)


let lastCameraPosition = new THREE.Vector3(0, 0, 0)
let tiles = {}
let currentKeysArray = []
window.tiles = tiles
// const terrainTarget = drone
const terrainTarget = app.get('camera')
const tileBuilder = new WHS.Loop(() => {
  const cameraPosition = terrainTarget.position
  if (cameraPosition.distanceTo(lastCameraPosition) > 10) {
    console.log(cameraPosition)
    lastCameraPosition = cameraPosition.clone()
    const x0 = Math.floor((cameraPosition.x + 50) / 100) + 330
    const y0 = Math.floor((-cameraPosition.y + 50) / 100) + 790
    let z0 = 11
    let visibleKeysArray = [
      // [x0, y0, z0],
      // [x0 + 1, y0, z0],
      // [x0, y0 + 1, z0],
      // [x0 + 1, y0 + 1, z0],
    ]
    z0 = 10
    const x0_11 = Math.floor(x0 / 2)
    const y0_11 = Math.floor(y0 / 2)
    visibleKeysArray = visibleKeysArray.concat([
      [x0_11 - 1, y0_11 - 1, z0],
      [x0_11 - 1, y0_11, z0],
      [x0_11 - 1, y0_11 + 1, z0],
      [x0_11, y0_11 - 1, z0],
      [x0_11, y0_11, z0],
      [x0_11, y0_11 + 1, z0],
      [x0_11 + 1, y0_11 - 1, z0],
      [x0_11 + 1, y0_11, z0],
      [x0_11 + 1, y0_11 + 1, z0],
    ])

    let camera = terrainTarget.native
    // camera.updateMatrix(); // make sure camera's local matrix is updated
    // camera.updateMatrixWorld(); // make sure camera's world matrix is updated
    // camera.matrixWorldInverse.getInverse( camera.matrixWorld );
    var frustum = new THREE.Frustum();
    frustum.setFromMatrix( new THREE.Matrix4().multiply( camera.projectionMatrix, camera.matrixWorldInverse ) );
    console.log( frustum );


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
      app.get('scene').remove(tiles[x])
      app.remove(tiles[x])
      delete tiles[x]
    })
    newKeys.forEach(k => {
      const xyz = k.split(',')
      let options = {}
      if (xyz[2] === '10') {options = {wireframe: false}}
      tiles[k] = buildTile(app, xyz[2], xyz[0], xyz[1], options)
      tiles[k].addTo(app)
    })
    currentKeysArray = visibleKeysArray.slice(0)

  }
})
app.addLoop(tileBuilder)
tileBuilder.start()

const gridHelper = new THREE.GridHelper( 1000, 10 )
gridHelper.geometry.rotateX(Math.PI / 2)
app.get('scene').add( gridHelper)
app.get('scene').add(new THREE.CameraHelper(app.get('camera').native))


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
