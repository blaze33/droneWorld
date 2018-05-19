import {
  Mesh,
  BufferAttribute,
  BufferGeometry
} from 'three'
import {renderer, scene, options} from '../index'
// import SimplifyModifier from '../modules/meshSimplify'
import Worker from './terrain.worker.js'
import {Material} from './shaders/material'
import {MaterialBasic} from './shaders/materialBasic'

// const textureLoader = new TextureLoader().setCrossOrigin('anonymous')
// const spectralTexture = textureLoader.load(
//   'https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Spectral.png'
// )

const materialBasic = MaterialBasic()

// cf. http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
const long2tile = (lon, zoom) => {
  return (lon + 180) / 360 * Math.pow(2, zoom)
}
const lat2tile = (lat, zoom) => {
  return (
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
  )
}
const offset = {y: 45.8671, x: 7.3087}
const chamonix = {x: long2tile(offset.x, 10), y: lat2tile(offset.y, 10)}
const offsetAtZ = (z) => {
  return {
    x: chamonix.x / Math.pow(2, 10 - z),
    y: chamonix.y / Math.pow(2, 10 - z)
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
    x * size - (offset.x % 1 - 0.5) * size - (1 - chamonix.x % 1) * 800,
    -y * size + (offset.y % 1 - 0.5) * size + (1 - chamonix.y % 1) * 800,
    0
  )
}

// PBR
const material = Material({}, {})

const buildTileFromWorker = event => {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(event.data.positions)
  const normals = new Float32Array(event.data.normals)
  const IndexArrayClass = {
    2: Uint16Array,
    4: Uint32Array
  }[event.data.bpe.indices]
  const index = new IndexArrayClass(event.data.indices)
  // const dem = new Uint8Array(event.data.dem)
  let uv = new Float32Array(positions.length / 3 * 2)
  const n = Math.sqrt(positions.length / 3)
  uv = uv.map((_, index) => index % 2 ? Math.floor((index / 2) / n) / n : (index / 2) % n / n)
  geometry.addAttribute('position', new BufferAttribute(positions, 3))
  geometry.addAttribute('normal', new BufferAttribute(normals, 3))
  geometry.addAttribute('uv', new BufferAttribute(uv, 2))
  geometry.setIndex(new BufferAttribute(index, 1))
  geometry.computeBoundingBox()

  const terrainMaterial = options.PBR ? material : materialBasic
  const plane = new Mesh(geometry, terrainMaterial)

  plane.key = event.data.key
  plane.castShadow = true
  plane.receiveShadow = true
  setTilePosition(plane, event.data.key)
  scene.add(plane)
  renderer.shadowMap.needsUpdate = true
}

let workerPool = []
const workerPoolSize = navigator.hardwareConcurrency - 1 || 3
for (let i = 0; i < workerPoolSize; i++) {
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
  workerPool.postMessage([z, x, y, segments, j, size])
}

export {
  buildPlane,
  material
}
