import {
  TextureLoader,
  ShaderMaterial,
  RawShaderMaterial,
  Mesh,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  RGBFormat,
  LinearFilter,
  RepeatWrapping,
  UniformsUtils,
  UniformsLib,
  ShadowMaterial,
} from 'three'
import {renderer, scene, sunPosition, options} from '../index'
// import SimplifyModifier from '../modules/meshSimplify'
import vertexShader from './shaders/terrain.vert'
import fragmentShader from './shaders/terrain.frag'
import shadowShader from './shaders/shadow.frag'
import whiteShader from './shaders/white.frag'
import identityShader from './shaders/white.vert'
import Worker from './terrain.worker.js';
import {Material} from './shaders/material'

const textureLoader = new TextureLoader().setCrossOrigin("anonymous")
const tilesElevationURL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
const tilesNormalURL = 'https://s3.amazonaws.com/elevation-tiles-prod/normal'

const heightMapTexture = (z, x, y) => {
  const tileURL = `${tilesElevationURL}/${z}/${x}/${y}.png`
  return textureLoader.load(tileURL)
}

const spectralTexture = textureLoader.load(
  "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Spectral.png"
)

const terrainMaterial = (z, x, y, options, uniforms) => {
  return new ShaderMaterial({
    uniforms: {
      heightmap: {value: heightMapTexture(z, x, y)},
      spectral: {value: spectralTexture},
      ...uniforms
    },
    vertexShader,
    fragmentShader,
    extensions: {
      derivatives: false,
    },
    wireframe: true,
    ...options,
  });
}

const rockTexture = textureLoader.load(require('../textures/Rock_08_UV_H_CM_1.jpg'))
const rockTextureNormal = textureLoader.load(require('../textures/Rock_08_UV_H_CM_1_normal.jpg'))
// const rockTexture = textureLoader.load(require('../textures/rock_brown_1600.jpg'))
const grassTexture = textureLoader.load(require('../textures/GrassGreenTexture0003.jpg'))
const grassTextureNormal = textureLoader.load(require('../textures/GrassGreenTexture0003_normal.jpg'))
// const grassTexture = textureLoader.load(require('../textures/rainforest512.jpg'))
const grassTexture2 = textureLoader.load(require('../textures/Grass_01_UV_H_CM_1.jpg'))
const icyTexture = textureLoader.load(require('../textures/snow_scuffed_ground_1.jpg'))
const snowTexture = textureLoader.load(require('../textures/Snow_01_UV_H_CM_1.jpg'))
rockTexture.wrapS = rockTexture.wrapT = RepeatWrapping
rockTextureNormal.wrapS = rockTextureNormal.wrapT = RepeatWrapping
grassTexture.wrapS = grassTexture.wrapT = RepeatWrapping
grassTextureNormal.wrapS = grassTextureNormal.wrapT = RepeatWrapping
grassTexture2.wrapS = grassTexture2.wrapT = RepeatWrapping
icyTexture.wrapS = icyTexture.wrapT = RepeatWrapping
snowTexture.wrapS = snowTexture.wrapT = RepeatWrapping

const spectralMaterial = (options, uniforms) => {
  const material = new ShaderMaterial({
    uniforms: {
      ...UniformsLib.common,
      ...UniformsLib.lights,
      roughness: {value: 1},
      metalness: {value: 0.5},
      // spectral: {value: spectralTexture},
      rockTexture: {value: rockTexture},
      rockTextureNormal: {value: rockTextureNormal},
      grassTexture: {value: grassTexture},
      grassTextureNormal: {value: grassTextureNormal},
      // icyTexture: {value: icyTexture},
      // snowTexture: {value: snowTexture},
      sunPosition: {value: sunPosition},
      ...uniforms
    },
    vertexShader: identityShader,
    fragmentShader: fragmentShader,
    extensions: {
      derivatives: true,
    },
    wireframe: false,
    lights: true,
    // transparent: true,
    // ...options,
  })
  material.isShaderMaterial = false
  material.isMeshStandardMaterial = true
  material.opacity = 1.0
  material.roughness = 1
  material.metalness = 0
  return material
}
const spectralMaterialInstance = spectralMaterial()

// cf. http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
const long2tile = (lon,zoom) => {
  return (lon+180)/360*Math.pow(2,zoom)
}
const lat2tile = (lat,zoom) => {
  return (
    (1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)
  )
}
const offset = {y: 45.8671, x: 7.3087}
const chamonix = {x: long2tile(offset.x, 10), y: lat2tile(offset.y, 10)}
const offsetAtZ = (z) => {
  return {
    x: chamonix.x / Math.pow(2, 10 - z),
    y: chamonix.y / Math.pow(2, 10 - z),
  }
}
window.chamonix = chamonix
const setTilePosition = (geometry, key) => {
  const zxyijs = key.split(',').map(x => parseInt(x, 10))
  const z = zxyijs[0]
  const x = zxyijs[1]
  const y = zxyijs[2]
  const size = zxyijs[5]
  const offset = offsetAtZ(z)
  geometry.position.set(
    x * size - (offset.x%1 - 0.5) * size - (1-chamonix.x%1) * 800,
    -y * size + (offset.y%1 - 0.5) * size + (1-chamonix.y%1) * 800,
    0
  )
}

// PBR
const material = Material({}, {})

const buildTileFromWorker = event => {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(event.data.positions)
  const normals = new Float32Array(event.data.normals)
  const indexArrayClass = {
    2: Uint16Array,
    4: Uint32Array
  }[event.data.bpe.indices]
  const index = new indexArrayClass(event.data.indices)
  // const dem = new Uint8Array(event.data.dem)
  let uv = new Float32Array(positions.length / 3 * 2)
  const n = Math.sqrt(positions.length / 3)
  uv = uv.map((_, index) => index % 2 ? Math.floor((index / 2) / n) /n : (index / 2) % n /  n)
  geometry.addAttribute('position', new BufferAttribute(positions, 3))
  geometry.addAttribute('normal', new BufferAttribute(normals, 3))
  geometry.addAttribute('uv', new BufferAttribute(uv, 2))
  geometry.setIndex(new BufferAttribute(index, 1))

  // standard shader material
  // const material = spectralMaterial({}, {heightmap: {value: heightTexture}})

  const terrainMaterial = options.PBR ? material : spectralMaterial()
  const plane = new Mesh( geometry, terrainMaterial )

  plane.key = event.data.key
  plane.castShadow = true; //default is false
  plane.receiveShadow = true;
  setTilePosition(plane, event.data.key)
  scene.add(plane)
  renderer.shadowMap.needsUpdate = true
  // var helper = new VertexNormalsHelper( plane, 2, 0x00ff00, 1 );
  // scene.add(helper)
}

let workerPool = []
const workerPoolSize = navigator.hardwareConcurrency - 1 || 3
for (let i=0;i<workerPoolSize;i++) {
  const worker = new Worker()
  worker.onmessage = buildTileFromWorker
  workerPool.push(worker)
}
let currentWorker = 0
workerPool.postMessage = args => {
  const worker = workerPool[currentWorker]
  worker.postMessage(args)
  currentWorker = currentWorker === workerPoolSize - 1 ? 0 : currentWorker + 1
}

const buildPlane = (z, x, y, segments, j, size) => {
  workerPool.postMessage([z, x, y, segments, j, size]);
}

export {
  buildPlane,
  material,
}
