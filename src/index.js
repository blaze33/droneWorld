import './index.css'
import * as THREE from 'three';
import * as WHS from 'whs'
import dat from 'dat.gui/build/dat.gui.js'
import Alea from 'alea'
import { Easing, Tween, autoPlay } from 'es6-tween'
import keyboardJS from 'keyboardjs'

// import './modules/terrain.js'
import DragControls from './modules/DragControls'
import FlyControls from './modules/FlyControls'
import SimplexNoise from './modules/simplexNoise'
import StatsModule from './modules/StatsModule'
import {initSky} from './sky'

import {tileBuilder} from './loops/tileBuilder'

const container = document.getElementById('root')
const cameraModule = new WHS.DefineModule(
  'camera',
  new WHS.PerspectiveCamera({ // Apply a camera.
    position: new THREE.Vector3(0, -500, 450),
    far: 1e6,
  })
)

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
  controlsModule,
  new StatsModule(0),
  new WHS.ResizeModule()
]);
window.app = app
const gui = new dat.GUI()
window.gui = gui
const scene = app.get('scene')
const camera = app.get('camera')

app.get('camera').native.up = new THREE.Vector3(0, 0, 1)
app.get('camera').native.lookAt({x: 0, y: 0, z: 0})

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

app.addLoop(tileBuilder)

// Start the app
app.get('renderer').setPixelRatio(1)
app.start();
tileBuilder.start()

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

keyboardJS.bind('c', e => {
  console.log(app.get('camera').position)
})

keyboardJS.bind('r', e => {
  const autoRotate = app.manager.modules.controls.controls.autoRotate
  app.manager.modules.controls.controls.autoRotate = !autoRotate
})

// tween js start
autoPlay(true)

export {scene, camera, drone}