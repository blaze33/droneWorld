import './index.css'
import {
  Scene,
  PerspectiveCamera,
  CubeCamera,
  Vector3,
  WebGLRenderer,
  PCFSoftShadowMap,
  Uncharted2ToneMapping,
  FogExp2,
  Mesh,
  SphereBufferGeometry,
  MeshBasicMaterial,
  AudioListener,

  // Water imports
  PlaneBufferGeometry,
  TextureLoader,
  RepeatWrapping
} from 'three'
import Water from './modules/Water'
import dat from 'dat.gui/build/dat.gui.js'
import Stats from 'stats.js'
import queryString from 'query-string'
import {WindowResize} from './modules/WindowResize'
// import {ShadowMapViewer} from './modules/ShadowMapViewer'
import {initSky} from './sky'
import {initLights, dirLight} from './lights'
import {tileBuilder} from './loops/tileBuilder'
import {
  initDoF,
  lensFlare
} from './postprocessing'
import {material} from './terrain'
import {particleGroups} from './particles'
import PubSub from './events'
import setupDrones from './drones'
import './controls'
import setupSound from './sound'

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
console.log(options)

const scene = new Scene()
let camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1e6)
var cubeCamera = new CubeCamera(1, 1e6, 1024)

window.cube = cubeCamera
cubeCamera.up.set(0, 0, 1)

camera.up = new Vector3(0, 0, 1)
camera.position.set(-70, 175, 345)
camera.lookAt(0, -400, 0)
camera.rollAngle = 0
camera.listener = new AudioListener()
camera.add(camera.listener)
setupSound()

var renderer = new WebGLRenderer({
  antialias: true,
  alpha: true
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
rendererFolder.add(rendererController, 'low')
rendererFolder.add(rendererController, 'lowShadow')
rendererFolder.add(rendererController, 'lowShadowDoF')
rendererFolder.add(rendererController, 'high')
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
const envMapScene = new Scene()
const sky2 = initSky(envMapScene, new Vector3().copy(sunPosition))
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

const water = new Water(
  waterGeometry,
  {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: new TextureLoader().load(require('./textures/waternormals.jpg'), function (texture) {
      texture.wrapS = texture.wrapT = RepeatWrapping
    }),
    alpha: waterParameters.alpha,
    sunDirection: dirLight.position.clone().normalize(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: waterParameters.distortionScale,
    fog: false
  }
)

water.up.set(0, 0, 1)
water.rotation.z = -Math.PI / 2
water.position.z = 43
gui.__folders['Sun, sky and ocean'].add(water.position, 'z', 0, 200, 1)
water.receiveShadow = true
window.water = water
scene.add(water)
// ##########################

setupDrones()

particleGroups.forEach(group => scene.add(group.mesh))
// var helper = new CameraHelper( camera );
// scene.add( helper );

// const shadowMapViewer = new ShadowMapViewer(dirLight)

let loops = [
  tileBuilder,
  () => lensFlare.position.copy(sunPosition),
  (timestamp, delta) => {
    particleGroups.forEach(group => group.tick(delta / 1000))
  }
]
const removeLoop = (loop) => {
  loops = loops.filter(item => item.id !== loop.id)
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

// postprocessing
const dofEffect = options.postprocessing ? initDoF(scene, renderer, camera, gui) : null

// Start the app
renderer.setPixelRatio(1.0)

const stats = new Stats()
document.body.appendChild(stats.dom)

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

    if (options.postprocessing) {
      sky2.material.uniforms.sunPosition.value = sunPosition
      cubeCamera.update(renderer, envMapScene)
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

  cleanLoops()

  stats.update()
}

mainLoop(0)

WindowResize(renderer, camera)

export {renderer, scene, camera, drone, sunPosition, gui, options, loops}
