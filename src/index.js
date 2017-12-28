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

// import './modules/terrain.js'
import DragControls from './modules/DragControls'
import FlyControls from './modules/FlyControls'
import {OrbitControls} from './modules/OrbitControls'
import SimplexNoise from './modules/simplexNoise'
import {WindowResize} from './modules/WindowResize'
import {ShadowMapViewer} from './modules/ShadowMapViewer'
import GLTFLoader from './modules/GLTFLoader'
import TrailRenderer from './modules/TrailRenderer'
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

// const orbitModule = new OrbitControls(camera, renderer.domElement)
const flyModule = new FlyControls(camera, renderer.domElement)
// orbitModule.target.z = 200
let controlsModule = flyModule

window.scene = scene
window.renderer = renderer
window.camera = camera
window.controls = controlsModule

const gui = new dat.GUI()
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
    fog: scene.fog !== undefined
  }
);

water.up.set(0, 0, 1)
water.rotation.z = - Math.PI / 2;
water.position.z = 100
gui.__folders['Sun, sky and ocean'].add(water.position, "z", 0, 200, 1)
water.receiveShadow = true;
window.water = water
scene.add( water );
// ##########################

let drone1
let trail
var loader = new GLTFLoader();
const droneController = {
  x: 0,
  y: 0,
  z: 0,
}
window.droneController = droneController
// Load a glTF resource
loader.load(
  // resource URL
  '/assets/drone/scene.gltf',
  // called when the resource is loaded
  function (gltf) {
    drone1 = gltf.scene.children[0]
    scene.add(drone1);
    window.drone1 = drone1
    drone1.position.z = 200
    drone1.up.set(0, 0, 1)
    drone1.position.copy(drone.position)
    drone1.rotation.x = 0
    drone1.scale.set(0.1, 0.1, 0.1)
    const droneFolder = gui.addFolder('drone')
    droneFolder.add(droneController, 'x', 0, 2 * Math.PI)
    droneFolder.add(droneController, 'y', 0, 2 * Math.PI)
    droneFolder.add(droneController, 'z', 0, 2 * Math.PI)

    const dragControls = new DragControls([drone1], camera, renderer.domElement)
    dragControls.addEventListener( 'dragstart', event => {
      toggleControls(controlsModule, false)
    });
    dragControls.addEventListener( 'dragend', event => {
      toggleControls(controlsModule, true)
    });

    // specify points to create planar trail-head geometry
    // var trailHeadGeometry = [];
    // trailHeadGeometry.push( 
    //   new Vector3( -10.0, 0.0, 0.0 ), 
    //   new Vector3( 0.0, 0.0, 0.0 ), 
    //   new Vector3( 10.0, 0.0, 0.0 ) 
    // );
    let trailHeadGeometry = [];
    var twoPI = Math.PI * 2;
    var index = 0;
    var scale = 5.0;
    var inc = twoPI / 16.0;
    for ( var i = 0; i <= twoPI + inc; i+= inc )  {
      var vector = new Vector3();
      vector.set( Math.cos( i ) * scale, Math.sin( i ) * scale, 0 );
      trailHeadGeometry[ index ] = vector;
      index ++;
    }

    // create the trail renderer object
    trail = new TrailRenderer( scene, false );

    // create material for the trail renderer
    var trailMaterial = TrailRenderer.createBaseMaterial(); 
    trailMaterial.uniforms.headColor.value.set( 1, 1, 1, 1 );
    trailMaterial.uniforms.tailColor.value.set( 1, 1, 1, 1 );
    trailMaterial.renderOrder = 2
    // specify length of trail
    var trailLength = 30;

    // initialize the trail
    trail.initialize( trailMaterial, trailLength, false, 10, trailHeadGeometry, drone1 );
    // trail.activate()
    window.trail = trail
  }
)

window.Tween = Tween
window.drone = drone
// const shadowMapViewer = new ShadowMapViewer(dirLight)

let lastTrailUpdateTime = -100
let lastTrailResetTime = -100
const loops = [
  tileBuilder,
  () => lensFlare.position.copy(sunPosition),
  () => {
    if (!drone1) return
    const cameraPosition = camera.position.clone()
    const camVec = camera.getWorldDirection();
    let targetPosition = cameraPosition.add(camVec.multiplyScalar(20))
    drone1.position.copy(targetPosition)
    drone1.rotation.set(camera.rotation.x, camera.rotation.y, camera.rotation.z)
    drone1.rotation.x += Math.PI / 2 + droneController.x
    drone1.rotation.y += Math.PI / 4 + droneController.y
    drone1.rotation.z += Math.PI + droneController.z
  },
  (timestamp) => {
    if (!trail) return
    // if ( timestamp - lastTrailUpdateTime > 10 ) {
      // trail.advance();
    //   lastTrailUpdateTime = timestamp;
    // } else {
    //   trail.updateHead();
    // }
    // if ( timestamp - lastTrailResetTime > 2000 ) {
    //   trail.reset();
    //   lastTrailResetTime = timestamp;
    // }
  },
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
    controlsModule.update(delta)
    loops.forEach(loop => loop(timestamp))

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
  console.log('controlsClass', newControlsClass)
  controlsModule.dispose()
  const newModule = new newControlsClass(camera, renderer.domElement)
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

// tween js start
autoPlay(true)

export {renderer, scene, camera, drone, sunPosition, gui, options}
