import './index.css'
import {
  Scene,
  PerspectiveCamera,
  CubeCamera,
  Vector2,
  Vector3,
  Matrix4,
  WebGLRenderer,
  PCFSoftShadowMap,
  Uncharted2ToneMapping,
  Color,
  FogExp2,
  Mesh,
  SphereBufferGeometry,
  MeshBasicMaterial,
  WebGLRenderTarget,
  DepthTexture,

  // Water imports
  PlaneBufferGeometry,
  TextureLoader,
  RepeatWrapping,
  LOD,
  MeshDepthMaterial,
  Plane,
  GridHelper
} from 'three'
import dat from 'dat.gui/build/dat.gui.js'
import Stats from 'stats.js'
import queryString from 'query-string'
import {WindowResize} from './modules/WindowResize'
// import {ShadowMapViewer} from './modules/ShadowMapViewer'
import {initSky} from './sky'
import {initLights, dirLight} from './lights'
import {terrainLoop} from './loops/terrainLoop'
import {
  lensFlare,
  motionBlurShader
} from './postprocessing'
import {particleGroups} from './particles'
import PubSub from './events'
import setupDrones from './drones'
import controls from './controls'
import setupSound from './sound'

import {
  EffectComposer,
  ShaderPass,
  RenderPass,
  SavePass,
  CopyShader,
  BlendShader,
  GlitchPass,
  Water,
  Reflector
} from './modules'
import {
  WaterShader,
  UnderwaterShader,
  WiggleShader
} from './ocean'

const queryStringOptions = queryString.parse(window.location.search)
const options = {
  PBR: queryStringOptions.PBR === 'true',
  shadows: queryStringOptions.shadows === 'true',
  postprocessing: queryStringOptions.postprocessing === 'true'
}
if (options.PBR) {
  // PBR material needs an envMap
  options.postprocessing = true
}

const scene = new Scene()
let camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1e6)

camera.up = new Vector3(0, 0, 1)
camera.position.set(-500, 0, 700)
camera.position.set(-70, -475, 275)
// camera.position.set(170, -500, 180)
camera.lookAt(0, 0, 0)
camera.rollAngle = 0
camera.userData = {terrainKeysUnder: []}
camera.updateMatrixWorld()
camera.updateProjectionMatrix()

setupSound()

var renderer = new WebGLRenderer({
  antialias: true,
  alpha: true,
  logarithmicDepthBuffer: false
})

renderer.gammaInput = true
renderer.gammaOutput = true
renderer.shadowMap.enabled = options.shadows
renderer.shadowMap.bias = 0.001
renderer.shadowMap.type = PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true
renderer.physicallyCorrectLights = true
renderer.toneMapping = Uncharted2ToneMapping

renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

window.scene = scene
window.renderer = renderer
window.camera = camera
window.controls = controls

const gui = new dat.GUI({ autoPlace: false })
gui.closed = true
window.document.getElementsByClassName('guiPane')[0].appendChild(gui.domElement)
window.gui = gui
PubSub.publish('x.gui.init', {gui})

const rendererFolder = gui.addFolder('Level of detail')
const RendererController = function () {
  this.low = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: false,
      postprocessing: false
    })
  }
  this.lowShadow = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: true,
      postprocessing: false
    })
  }
  this.lowShadowDoF = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: true,
      postprocessing: true
    })
  }
  this.high = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: true,
      shadows: true,
      postprocessing: true
    })
  }
}
const rendererController = new RendererController()
const lowController = rendererFolder.add(rendererController, 'low')
lowController.name('low (default)')
// rendererFolder.add(rendererController, 'lowShadow')
// rendererFolder.add(rendererController, 'lowShadowDoF')
// rendererFolder.add(rendererController, 'high')
scene.background = new Color(0x91abb5);
scene.fog = new FogExp2(0x91abb5, 0.0005)

const drone = new Mesh(
  new SphereBufferGeometry(5, 5, 5),
  new MeshBasicMaterial({
    color: 0xffffff
  })
)
drone.visible = false
scene.add(drone)

const sunPosition = new Vector3()
window.sunPosition = sunPosition
initSky(scene, sunPosition, gui)
initLights(scene, sunPosition)
dirLight.target = drone
scene.add(lensFlare)

// ##########################
const waterParameters = {
  oceanSide: 20000,
  size: 1.0,
  distortionScale: 3.7,
  alpha: 1.0
}
var waterGeometry = new PlaneBufferGeometry(waterParameters.oceanSide * 5, waterParameters.oceanSide * 5)

const textureLoader = new TextureLoader().setCrossOrigin('anonymous')
const water = new Water(
  waterGeometry,
  {
    textureWidth: 512,
    textureHeight: 512,
    color: 0xffffff,
    flowDirection: new Vector2(1, 1),
    scale: 20000 / 15.0,
    normalMap0: textureLoader.load(require('./textures/Water_1_M_Normal.jpg')),
    normalMap1: textureLoader.load(require('./textures/Water_2_M_Normal.jpg')),
    clipBias: 0.00001,
    reflectivity: 0.2,
    shader: WaterShader,
    flowSpeed: 0.1
  }
)
window.water = water
const waterTarget = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
const depthMaterial = new MeshDepthMaterial()
waterTarget.depthBuffer = true
waterTarget.depthTexture = new DepthTexture()
water.material.uniforms.tDepth.value = waterTarget.depthTexture

water.up.set(0, 0, 1)
water.rotation.z = -Math.PI / 2
water.position.z = 200
water.material.uniforms.surface.value = water.position.z
gui.__folders['Sun, sky and ocean'].add(water.position, 'z', 0, 200, 1)
water.receiveShadow = true
water.userData.isWater = true
window.water = water
scene.add(water)

const underwaterReflector = new Reflector(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  clipBias: 0.00001
  // shader: WaterRefractionShader
})
underwaterReflector.rotation.y = Math.PI
underwaterReflector.up.set(0, 0, -1)
underwaterReflector.position.copy(water.position)
underwaterReflector.getRenderTarget().depthBuffer = true
underwaterReflector.getRenderTarget().depthTexture = new DepthTexture()
window.ref = underwaterReflector
underwaterReflector.updateMatrixWorld()

// var gridHelper = new GridHelper(10000, 1000)
// gridHelper.up.set(0, 0, 1)
// gridHelper.position.copy(water.position)
// gridHelper.rotation.y = Math.PI / 2
// gridHelper.rotation.z = Math.PI / 2
// window.gridHelper = gridHelper
// scene.add(gridHelper)

// ##########################

setupDrones()

particleGroups.forEach(group => scene.add(group.mesh))
// var helper = new CameraHelper( camera );
// scene.add( helper );

// const shadowMapViewer = new ShadowMapViewer(dirLight)
let shakeCamera = false
let shakeAmplitude = 1
PubSub.subscribe('x.camera.shake.start', (msg, value = 1) => (shakeCamera = true))
PubSub.subscribe('x.camera.shake.stop', () => (shakeCamera = false))

let loops = [
  () => lensFlare.position.copy(sunPosition),
  terrainLoop,
  (timestamp, delta) => {
    particleGroups.forEach(group => group.tick(delta / 1000))
  },
  () => {
    if (shakeCamera) {
      camera.position.add({
        x: (Math.random() - 0.5) * shakeAmplitude,
        y: (Math.random() - 0.5) * shakeAmplitude,
        z: (Math.random() - 0.5) * shakeAmplitude
      })
      glitch.enabled = true
      motionPass.renderToScreen = false
    } else {
      glitch.enabled = false
      motionPass.renderToScreen = true
    }
  },
  () => scene.children.forEach(child => {
    if (child instanceof LOD) {
      child.update(camera)
    }
  }),
  (timestamp, delta) => {
    if (camera.position.z < water.position.z) {
      underwaterPass.enabled = true
      wigglePass.enabled = true
      water.visible = false
      underwaterReflector.onBeforeRender(renderer, scene, camera)
      underwaterPass.material.uniforms.time.value = timestamp / 1000
      wigglePass.material.uniforms.time.value = timestamp / 1000
      controls.setAcceleration(30)
    } else {
      underwaterPass.enabled = false
      wigglePass.enabled = false
      water.visible = true
      controls.setAcceleration(150)
    }
  }
]
const removeLoop = (loop) => {
  loops = loops.filter(item => item !== loop)
}
PubSub.subscribe('x.loops.remove', (msg, loop) => removeLoop(loop))
PubSub.subscribe('x.loops.push', (msg, loop) => loops.push(loop))
PubSub.subscribe('x.loops.unshift', (msg, loop) => loops.unshift(loop))

window.loops = loops
PubSub.publish('x.loops.loaded')
const cleanLoops = () => {
  loops.forEach(loop => {
    if (loop.alive !== undefined && loop.alive === false && loop.object) {
      scene.remove(loop.object)
    }
  })
  loops = loops.filter(loop => loop.alive === undefined || loop.alive === true)
}

// Start the app
renderer.setPixelRatio(1.0)

const stats = new Stats()
document.body.appendChild(stats.dom)

// ###################################
// EFFECTS
// define a render target with a depthbuffer
const target = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
const composer = new EffectComposer(renderer, target)

// initial render pass
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

// add an underwater shader pass
const underwaterPass = new ShaderPass(UnderwaterShader)
underwaterPass.enabled = false
underwaterPass.material.uniforms.waterLevel.value = water.position.z
underwaterPass.material.uniforms.tDepth.value = waterTarget.depthTexture
underwaterPass.material.uniforms.cameraPosition.value = camera.position
underwaterPass.material.uniforms.sunPosition.value = sunPosition
underwaterPass.material.uniforms.tReflectionMap.value = underwaterReflector.getRenderTarget().texture
underwaterPass.material.uniforms.tReflectionDepth.value = underwaterReflector.getRenderTarget().depthTexture
let tNormalMap0 = underwaterPass.material.uniforms.tNormalMap0
let tNormalMap1 = underwaterPass.material.uniforms.tNormalMap1
tNormalMap0.value = textureLoader.load(require('./textures/Water_1_M_Normal.jpg'))
tNormalMap1.value = textureLoader.load(require('./textures/Water_2_M_Normal.jpg'))
tNormalMap0.value.wrapS = tNormalMap0.value.wrapT = RepeatWrapping
tNormalMap1.value.wrapS = tNormalMap1.value.wrapT = RepeatWrapping
composer.addPass(underwaterPass)
window.upass = underwaterPass

// add an underwater wiggle pass
const wigglePass = new ShaderPass(WiggleShader)
wigglePass.enabled = false
composer.addPass(wigglePass)

// add a motion blur pass
const motionPass = new ShaderPass(motionBlurShader, 'tColor')
motionPass.renderToScreen = true
motionPass.material.uniforms.tDepth.value = waterTarget.depthTexture
motionPass.material.uniforms.velocityFactor.value = 1
composer.addPass(motionPass)

// define variables used by the motion blur pass
let previousMatrixWorldInverse = new Matrix4()
let previousProjectionMatrix = new Matrix4()
let previousCameraPosition = new Vector3()
let tmpMatrix = new Matrix4()

// add a glitch pass
const glitch = new GlitchPass()
glitch.renderToScreen = true
composer.addPass(glitch)
// ###################################

let play = true
PubSub.subscribe('x.toggle.play', () => { play = !play })

let lastTimestamp = 0
var mainLoop = (timestamp) => {
  requestAnimationFrame(mainLoop)
  let delta = timestamp - lastTimestamp
  lastTimestamp = timestamp

  if (play) {
    loops.forEach(loop => {
      loop.loop ? loop.loop(timestamp, delta) : loop(timestamp, delta)
    })

    // update motion blur shader uniforms
    motionPass.material.uniforms.delta.value = delta
    // tricky part to compute the clip-to-world and world-to-clip matrices
    motionPass.material.uniforms.clipToWorldMatrix.value
        .getInverse(camera.matrixWorldInverse).multiply(tmpMatrix.getInverse(camera.projectionMatrix))
    motionPass.material.uniforms.previousWorldToClipMatrix.value
        .copy(previousProjectionMatrix.multiply(previousMatrixWorldInverse))
    motionPass.material.uniforms.cameraMove.value.copy(camera.position).sub(previousCameraPosition)

    // render to depth target
    scene.overrideMaterial = depthMaterial
    water.visible = false
    renderer.setRenderTarget(waterTarget)
    renderer.render(scene, camera)
    water.visible = true
    scene.overrideMaterial = null

    // water uniforms
    water.material.uniforms.clipToWorldMatrix.value = motionPass.material.uniforms.clipToWorldMatrix.value
    underwaterPass.material.uniforms.clipToWorldMatrix.value = motionPass.material.uniforms.clipToWorldMatrix.value
    underwaterPass.material.uniforms.worldToClipMatrix.value
      .copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse)

    // render the postprocessing passes
    composer.render(delta)

    // save some values for the next render pass
    previousMatrixWorldInverse.copy(camera.matrixWorldInverse)
    previousProjectionMatrix.copy(camera.projectionMatrix)
    previousCameraPosition.copy(camera.position)

    // if (dirLight.shadow && dirLight.shadow.map) {
    //   shadowMapViewer.render(renderer)
    // }
  }

  cleanLoops()

  stats.update()
}

mainLoop(0)

WindowResize(renderer, camera)

export {renderer, scene, camera, drone, sunPosition, gui, options, loops}
