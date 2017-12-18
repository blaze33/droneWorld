import './index.css'
import * as THREE from 'three';
import dat from 'dat.gui/build/dat.gui.js'
import Alea from 'alea'
import { Easing, Tween, autoPlay } from 'es6-tween'
import keyboardJS from 'keyboardjs'
import Stats from 'stats.js'

// import './modules/terrain.js'
import DragControls from './modules/DragControls'
import FlyControls from './modules/FlyControls'
import {OrbitControls} from './modules/OrbitControls'
import SimplexNoise from './modules/simplexNoise'
import {WindowResize} from './modules/WindowResize'
import {initSky} from './sky'

import {tileBuilder} from './loops/tileBuilder'

window.THREE = THREE

const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1e6);

camera.up = new THREE.Vector3(0, 0, 1)
camera.position.set(1200, -1175, 190)
camera.lookAt(0, 0, 0)

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// const orbitModule = new OrbitControls(camera, renderer.domElement)
// let controlsModule = orbitModule

const flyModule = new FlyControls(camera, renderer.domElement)
let controlsModule = flyModule

window.THREE = THREE
window.scene = scene
window.renderer = renderer
window.camera = camera
window.controls = controlsModule

const gui = new dat.GUI()
window.gui = gui
// const scene = app.get('scene')
// const camera = app.get('camera')


const drone = new THREE.Mesh(
  new THREE.SphereBufferGeometry(5, 5, 5),
  new THREE.MeshBasicMaterial({
    color: 0xffffff
  })
)
scene.add(drone)
window.drone = drone
const dragControls = new DragControls([drone], camera, renderer.domElement)
dragControls.addEventListener( 'dragstart', event => {
  toggleControls(controlsModule, false)
});
dragControls.addEventListener( 'dragend', event => {
  toggleControls(controlsModule, true)
});
// const dragModule = new WHS.ControlsModule.from(dragControls)

initSky(scene, gui)

const loops = [
  tileBuilder,
]

// Start the app
renderer.setPixelRatio(1)
controlsModule.update(0)

const stats = new Stats()
document.body.appendChild(stats.dom)

let lastTimestamp = 0
var mainLoop = (timestamp) => {
  requestAnimationFrame(mainLoop)
  let delta = timestamp - lastTimestamp
  lastTimestamp = timestamp

  stats.begin()

  loops.forEach(loop => loop(timestamp))
  controlsModule.update(delta)

  renderer.render(scene, camera);

  stats.end()
};

mainLoop(0)

WindowResize(renderer, camera)

const toggleControls = (controls, state) => {
  state = state !== undefined ? state : controls.enabled
  controls.enabled = state
}

keyboardJS.bind('p', e => {
  camera = camera.clone()
  const newControlsClass = controlsModule.constructor.name === 'OrbitControls' ? FlyControls : OrbitControls
  controlsModule.dispose()
  controlsModule = new newControlsClass(camera, renderer.domElement)
  controlsModule.update()
  // console.log("disposed", controlsModule)
  // toggleControls(controlsModule, false)
  // controlsModule = controlsModule === orbitModule ? flyModule : orbitModule
  // if (controlsModule === orbitModule) {
  //   console.log(controlsModule)
  //   let cam = drone.position.clone()
  //   const target = orbitModule.target
  //   let tween = new Tween({x: target.x, y: target.y, z: target.z})
  //     .to({ x: cam.x, y: cam.y + 1000, z: 0 }, 1000)
  //     .on('update', ({x, y, z}) => {
  //       orbitModule.target.set(x, y, z)
  //       orbitModule.update()
  //     })
  //     .start();
  //   console.log(tween)
  // }
  // toggleControls(controlsModule, true)
  // console.log("apply", controlsModule)
})

keyboardJS.bind('c', e => {
  console.log(camera.position)
})

// keyboardJS.bind('r', e => {
//   const autoRotate = app.manager.modules.controls.controls.autoRotate
//   app.manager.modules.controls.controls.autoRotate = !autoRotate
// })

// tween js start
autoPlay(true)

export {scene, camera, drone}