import './index.css'
import {
  Scene,
  PerspectiveCamera,
  CubeCamera,
  Vector2,
  Vector3,
  WebGLRenderer,
  PCFSoftShadowMap,
  Uncharted2ToneMapping,
  FogExp2,
  Mesh,
  SphereBufferGeometry,
  MeshBasicMaterial,

  // Water imports
  PlaneBufferGeometry,
  TextureLoader,
  RepeatWrapping,
} from 'three'
import Water from './modules/Water'
import dat from 'dat.gui/build/dat.gui.js'
import Alea from 'alea'
import { Easing, Tween, autoPlay } from 'es6-tween'
import keyboardJS from 'keyboardjs'
import Stats from 'stats.js'
import queryString from 'query-string'
import nipplejs from 'nipplejs'
import lock from 'pointer-lock'

// import './modules/terrain.js'
import DragControls from './modules/DragControls'
import FlyControls from './modules/FlyControls'
import {OrbitControls} from './modules/OrbitControls'
import SimplexNoise from './modules/simplexNoise'
import {WindowResize} from './modules/WindowResize'
import {ShadowMapViewer} from './modules/ShadowMapViewer'
import GLTFLoader from './modules/GLTFLoader'
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
import {mobileAndTabletcheck} from './utils/isMobile'
import {screenXYclamped} from './utils'
import {particleGroups, triggerExplosion} from './particles'
import PubSub from './events'
import droneMesh from './drones'

const queryStringOptions = queryString.parse(window.location.search)
const options = {
  PBR: queryStringOptions.PBR === 'true' ? true : false,
  shadows: queryStringOptions.shadows === 'true' ? true : false,
  postprocessing: queryStringOptions.postprocessing === 'true' ? true : false,
}
if (options.PBR) {
  // PBR material needs an envMap
  options.postprocessing = true
}
console.log(options)

const scene = new Scene();
let camera = new PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 1e6);
var cubeCamera = new CubeCamera( 1, 1e6, 1024 );

window.cube = cubeCamera
cubeCamera.up.set(0, 0, 1)

camera.up = new Vector3(0, 0, 1)
camera.position.set(-70, 175, 345)
camera.lookAt(0, -400, 0)

var renderer = new WebGLRenderer({
  antialias: true,
  alpha: true,
});

renderer.gammaInput = true
renderer.gammaOutput = true
renderer.shadowMap.enabled = options.shadows
renderer.shadowMap.bias = 0.001
renderer.shadowMap.type = PCFSoftShadowMap
renderer.shadowMap.autoUpdate = true
renderer.physicallyCorrectLights = true
renderer.toneMapping = Uncharted2ToneMapping

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

let controlsModule
let controlsElement
let isMobile = false
if (mobileAndTabletcheck()) {
  isMobile = true

  document.getElementById('touchPane').style.display = 'block'
  const touchPaneLeft = window.document.getElementsByClassName('touchPaneLeft')[0]
  const nippleLook = nipplejs.create({
    zone: touchPaneLeft,
    mode: 'static',
    position: {left: '30%', top: '90%'},
    color: 'white',
  })

  // display touch buttons
  Array.from(document.getElementsByClassName('touchButton')).map(el => el.style.display = 'block')
  // hide verbose text
  document.getElementById('verbosePane').style.display = 'none'
  // get button X
  const buttonX = document.getElementById('buttonX')
  const pressX = (event) => {
    event.target.style.opacity = 0.5
    keyboardJS.pressKey('x')
    setTimeout(() => event.target.style.opacity = 0.3, 250)
  }
  buttonX.addEventListener('click', pressX, false)
  buttonX.addEventListener('touchstart', pressX, false)

  controlsModule = new FlyControls(camera, touchPaneLeft, nippleLook)
  controlsElement = touchPaneLeft
} else {
  const pointer = lock(renderer.domElement)
  controlsModule = new FlyControls(camera, renderer.domElement, undefined, pointer)
  controlsElement = renderer.domElement
}

window.scene = scene
window.renderer = renderer
window.camera = camera
window.controls = controlsModule

const gui = new dat.GUI({ autoPlace: false })
gui.closed = true
window.document.getElementsByClassName('guiPane')[0].appendChild(gui.domElement)
window.gui = gui

const rendererFolder = gui.addFolder('Level of detail')
const RendererController = function () {
  this.low = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: false,
      postprocessing: false,
    })
  }
  this.lowShadow = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: true,
      postprocessing: false,
    })
  }
  this.lowShadowDoF = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: false,
      shadows: true,
      postprocessing: true,
    })
  }
  this.high = () => {
    window.location.href = window.location.pathname + '?' +
    queryString.stringify({
      PBR: true,
      shadows: true,
      postprocessing: true,
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
const sky = initSky(scene, sunPosition, gui)
const envMapScene = new Scene();
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
var waterGeometry = new PlaneBufferGeometry( waterParameters.oceanSide * 5, waterParameters.oceanSide * 5 );

const water = new Water(
  waterGeometry,
  {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: new TextureLoader().load(require('./textures/waternormals.jpg'), function ( texture ) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
    }),
    alpha: waterParameters.alpha,
    sunDirection: dirLight.position.clone().normalize(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: waterParameters.distortionScale,
    fog: false,
  }
);

water.up.set(0, 0, 1)
water.rotation.z = - Math.PI / 2;
water.position.z = 43
gui.__folders['Sun, sky and ocean'].add(water.position, 'z', 0, 200, 1)
water.receiveShadow = true;
window.water = water
scene.add( water );
// ##########################

let drone1, drone2
let trail
var loader = new GLTFLoader();
const droneController = {
  x: 0,
  y: 0,
  z: 0,
}
window.droneController = droneController

const initDrones = (msg, data) => {
  console.log(msg, data)
  console.log(droneMesh)
  drone1 = data.mesh
  scene.add(drone1);
  window.drone1 = drone1
  drone1.position.z = 200
  drone1.up.set(0, 0, 1)
  drone1.position.copy(drone.position)
  drone1.rotation.x = 0
  drone1.scale.set(0.1, 0.1, 0.1)

  drone2 = drone1.clone()
  window.drone2 = drone2
  drone2.name = 'drone2'
  scene.add(drone2);
  drone2.position.z = 200
  drone2.up.set(0, 0, 1)
  drone2.position.copy(drone.position)
  drone2.rotation.x = 0
  drone2.scale.set(0.1, 0.1, 0.1)

  const droneFolder = gui.addFolder('drone')
  droneFolder.add(droneController, 'x', 0, 2 * Math.PI)
  droneFolder.add(droneController, 'y', 0, 2 * Math.PI)
  droneFolder.add(droneController, 'z', 0, 2 * Math.PI)

}
PubSub.subscribe('assets.drone.loaded', initDrones)

particleGroups.forEach(group => scene.add(group.mesh))
window.triggerExplosion = triggerExplosion
window.particleGroups = particleGroups

// const shadowMapViewer = new ShadowMapViewer(dirLight)
const hudElement = document.getElementById('hud')
const hudTarget = document.getElementById('target')
const hudHorizon = document.getElementById('horizon')
let hudPosition
let targetDistance
let lastTrailUpdateTime = -100
let lastTrailResetTime = -100
let loops = [
  tileBuilder,
  () => lensFlare.position.copy(sunPosition),
  () => {
    if (!drone1) return
    const cameraPosition = camera.position.clone()
    const camVec = camera.getWorldDirection();
    let targetPosition = cameraPosition.add(camVec.multiplyScalar(20))
    drone1.position.copy(targetPosition)
    drone1.lookAt(targetPosition
      .add(camVec)
      .add({x:0, y:0, z:60})
    )
    drone1.rotation.x += droneController.x
    drone1.rotation.y += droneController.y
    drone1.rotation.z += droneController.z
  },
  (timestamp) => {
    if (!drone2) return
    const radius = 280
    drone2.position.set(
      radius * Math.cos(timestamp / 1000 / 3),
      radius * Math.sin(timestamp / 1000 / 3),
      275
    )
    hudPosition = screenXYclamped(drone2.position)
    hudElement.style.left = `${hudPosition.x - 10}px`
    hudElement.style.top = `${hudPosition.y - 10}px`
    hudElement.style.borderColor = hudPosition.z > 1 ? 'red' : 'orange'
    targetDistance = new Vector2(window.innerWidth / 2, window.innerHeight / 2).sub(
      new Vector2(hudPosition.x, hudPosition.y)
    ).length()
    if (hudElement.style.borderColor === 'orange' && targetDistance < 75) {
      hudElement.style.borderColor = '#0f0'
      drone1.armed = true
    } else {
      drone1.armed = false
    }
  },
  (timestamp) => {
    const localX = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const localY = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    const rollAngle = (
      Math.PI / 2 - camera.up.angleTo(localX) * Math.sign(camera.up.dot(localY))
    )
    camera.rollAngle = rollAngle
    const pitch = camera.up.dot(camera.getWorldDirection())
    const rollAngleDegree = rollAngle / Math.PI * 180
    hudHorizon.style.transform = `translateX(-50%) translateY(${pitch * window.innerHeight / 2}px) rotate(${rollAngleDegree}deg)`
  },
  (timestamp, delta) => {
    particleGroups.forEach(group => group.tick(delta / 1000))
  },
]
const cleanLoops = () => {
  loops.forEach(loop => {
    console.log()
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
    controlsModule.update(delta)
    loops.forEach(loop => {
      loop.loop ? loop.loop(timestamp, delta) : loop(timestamp, delta)
    })

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

  cleanLoops()

  stats.update()
};

mainLoop(0)

WindowResize(renderer, camera)

const toggleControls = (controls, state) => {
  state = state !== undefined ? state : controls.enabled
  controls.enabled = state
}

keyboardJS.bind('p', e => {
  if (isMobile) {return}
  // camera = camera.clone()
  const newControlsClass = controlsModule.constructor.name === 'OrbitControls' ? FlyControls : OrbitControls
  console.log('controlsClass', newControlsClass)
  controlsModule.dispose()
  const newModule = new newControlsClass(camera, controlsElement)
  window.controls = newModule
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

const bullet = new Mesh(
  new SphereBufferGeometry(1, 5, 5),
  new MeshBasicMaterial({color: 0x111111})
)
renderer.domElement.addEventListener('mousedown', e => {
  if (!drone1 || !drone1.armed) return
  const fire = bullet.clone()
  fire.position.copy(drone1.position)
  scene.add(fire)

  const BulletContructor = function() {
    this.alive = true
    this.object = fire
    this.loop = (timestamp, delta) => {
      if (!this.alive) return
      const vec = drone2.position.clone().sub(fire.position)
      if (vec.length() < 10) {
        this.alive = false
        triggerExplosion(fire.position)
      }
      const newDir = vec.normalize().multiplyScalar(10 * delta / 16.66)
      fire.position.add(newDir)
    }
  }

  const callback = new BulletContructor()
  loops.push(callback)
}, false)

// tween js start
autoPlay(true)

export {renderer, scene, camera, drone, sunPosition, gui, options}
