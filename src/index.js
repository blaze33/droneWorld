import './index.css'
import * as THREE from 'three';
import dat from 'dat.gui/build/dat.gui.js'
import Alea from 'alea'
import { Easing, Tween, autoPlay } from 'es6-tween'
import keyboardJS from 'keyboardjs'
import Stats from 'stats.js'
import queryString from 'query-string'

// import './modules/terrain.js'
import DragControls from './modules/DragControls'
import FlyControls from './modules/FlyControls'
import {OrbitControls} from './modules/OrbitControls'
import SimplexNoise from './modules/simplexNoise'
import {WindowResize} from './modules/WindowResize'
import {ShadowMapViewer} from './modules/ShadowMapViewer'
import {initSky} from './sky'
import {initLights} from './lights'
import {tileBuilder} from './loops/tileBuilder'
import {dirLight} from './lights'
import {
  EffectComposer,
  RenderPass,
  ShaderPass,
  BokehShader,
  initDoF,
  lensFlare,
} from './postprocessing'
import {material} from './terrain'


window.THREE = THREE

const queryStringOptions = queryString.parse(window.location.search)
const options = {
  PBR: queryStringOptions.PBR === 'false' ? false : true,
  shadows: queryStringOptions.shadows === 'false' ? false : true,
  postprocessing: queryStringOptions.postprocessing === 'false' ? false : true,
}
if (options.PBR) {
  // PBR material needs an envMap
  options.postprocessing = true
}
console.log(options)

const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 50, 1e6);
var cubeCamera = new THREE.CubeCamera( 1, 1e6, 1024 );

window.cube = cubeCamera
cubeCamera.up.set(0, 0, 1)

camera.up = new THREE.Vector3(0, 0, 1)
camera.position.set(1200, -1175, 70)
camera.lookAt(0, 0, 0)

var renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.gammaInput = true
renderer.gammaOutput = true
renderer.shadowMap.enabled = options.shadows
renderer.shadowMap.bias = 0.001
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true
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

scene.fog = new THREE.FogExp2(0x91abb5, 0.0005)


const drone = new THREE.Mesh(
  new THREE.SphereBufferGeometry(5, 5, 5),
  new THREE.MeshBasicMaterial({
    color: 0xffffff
  })
)
scene.add(drone)

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
const sky = initSky(scene, sunPosition, gui)
const envMapScene = new THREE.Scene();
const sky2 = initSky(envMapScene, new THREE.Vector3().copy(sunPosition))
initLights(scene, sunPosition)
dirLight.target = drone
scene.add(lensFlare)

// const shadowMapViewer = new ShadowMapViewer(dirLight)

const loops = [
  tileBuilder,
  () => lensFlare.position.copy(sunPosition)
]

// postprocessing
const dofEffect = options.postprocessing ? initDoF(scene, renderer, camera, gui) : null

// Start the app
renderer.setPixelRatio(1.0)
controlsModule.update(0)

const stats = new Stats()
document.body.appendChild(stats.dom)

let play = true
let lastTimestamp = 0
var mainLoop = (timestamp) => {
  requestAnimationFrame(mainLoop)
  let delta = timestamp - lastTimestamp
  lastTimestamp = timestamp

  if (play) {
    loops.forEach(loop => loop(timestamp))
    controlsModule.update(delta)

    if (options.postprocessing) {
      sky2.material.uniforms.sunPosition.value = sunPosition
      cubeCamera.update(renderer, envMapScene);
      const envMap = cubeCamera.renderTarget
      material.uniforms.envMap.value = envMap.texture

      dofEffect.renderDepth()
      dofEffect.composer.render()
    } else {
      renderer.render(scene, camera)
    }

    // if (dirLight.shadow && dirLight.shadow.map) {
    //   shadowMapViewer.render(renderer)
    // }
  }

  stats.update()
};

mainLoop(0)

WindowResize(renderer, camera)

const toggleControls = (controls, state) => {
  state = state !== undefined ? state : controls.enabled
  controls.enabled = state
}

keyboardJS.bind('p', e => {
  // camera = camera.clone()
  const newControlsClass = controlsModule.constructor.name === 'OrbitControls' ? FlyControls : OrbitControls
  console.log('controlsClass', newControlsClass.name)
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

keyboardJS.bind('space', e => play = !play)

// tween js start
autoPlay(true)

export {renderer, scene, camera, drone, sunPosition, gui, options}
