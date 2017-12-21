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
import {ShadowMapViewer} from './modules/ShadowMapViewer'
import {initSky} from './sky'

import {tileBuilder} from './loops/tileBuilder'

window.THREE = THREE

const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1e6);

camera.up = new THREE.Vector3(0, 0, 1)
camera.position.set(1200, -1175, 190)
camera.lookAt(0, 0, 0)

var renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.gammaInput = true
renderer.gammaOutput = true
renderer.shadowMap.enabled = true
renderer.shadowMap.bias = 0.0001
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = false
renderer.physicallyCorrectLights = true
renderer.toneMapping = THREE.Uncharted2ToneMapping

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const orbitModule = new OrbitControls(camera, renderer.domElement)
let controlsModule = orbitModule

// const flyModule = new FlyControls(camera, renderer.domElement)
// let controlsModule = flyModule

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

const sunPosition = new THREE.Vector3()
window.sunPosition = sunPosition
initSky(scene, gui, sunPosition)

var dirLight = new THREE.DirectionalLight( 0xffffff, 1);
dirLight.position.copy(sunPosition);
dirLight.position.normalize()
dirLight.position.multiplyScalar(2000.0)
dirLight.up.set(0, 0, 1)
dirLight.name = "sunlight";
dirLight.needsUpdate = true
window.dirLight = dirLight
scene.add( dirLight );

var helper = new THREE.DirectionalLightHelper( dirLight, 5000 );
scene.add( helper );

dirLight.castShadow = true;
dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 1024;

var d = 1024;

dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

dirLight.shadow.camera.far = 5000;
dirLight.shadow.bias = -0.0001;

var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
scene.add( light );
var light = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( light );

// const shadowMapViewer = new ShadowMapViewer(dirLight)

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

  // if (dirLight.shadow && dirLight.shadow.map) {
  //   shadowMapViewer.render(renderer)
  // }

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
  const newModule = new newControlsClass(camera, renderer.domElement)
  controlsModule = newModule
  controlsModule.update(0)

  if (newControlsClass === OrbitControls) {
    let cam = drone.position.clone()
    newModule.target.set(cam.x, cam.y, cam.z)
  }
})

keyboardJS.bind('c', e => {
  console.log(camera.position)
})

keyboardJS.bind('r', e => {
  if (controlsModule.constructor.name === 'OrbitControls') {
    controlsModule.autoRotate = !controlsModule.autoRotate
  }
})

// tween js start
autoPlay(true)

export {renderer, scene, camera, drone, sunPosition}
