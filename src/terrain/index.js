import {
  Mesh,
  BufferAttribute,
  BufferGeometry
  // WireframeGeometry,
  // LineSegments
} from 'three'
import { renderer, scene } from '../index'
// import SimplifyModifier from '../modules/meshSimplify'
import Worker from './terrain.worker.js'
// import { Material } from '../materials/terrainPhysical'
// import { MaterialBasic } from '../materials/terrainTileRaw'
import { MaterialBasic } from '../materials/terrainTile'

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
const offset = { y: 45.8671, x: 7.3087 }
const chamonix = { x: long2tile(offset.x, 10), y: lat2tile(offset.y, 10) }
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

const processStats = data => {
  scene.userData.wasm = (scene.userData.wasm || 0) + data.wasm
  scene.userData.js = (scene.userData.js || 0) + data.js
  console.log(data.wasm, data.js, scene.userData)
}

const buildTileFromWorker = event => {
  if (event.data.stats) {
    processStats(event.data)
    return
  }

  const geometry = new BufferGeometry()
  const positions = new Float32Array(event.data.positions)
  const normals = new Float32Array(event.data.normals)
  const uvs = new Float32Array(event.data.uvs)
  const IndexArrayClass = {
    2: Uint16Array,
    4: Uint32Array
  }[event.data.bpe.indices]
  const index = new IndexArrayClass(event.data.indices)

  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
  geometry.setIndex(new BufferAttribute(index, 1))
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()

  const plane = new Mesh(geometry, materialBasic)

  plane.key = event.data.key
  plane.name = 'terrainTile'
  plane.castShadow = true
  plane.receiveShadow = true
  plane.layers.enable(3)
  setTilePosition(plane, event.data.key)
  scene.add(plane)
  renderer.shadowMap.needsUpdate = true

  // const wireframe = new WireframeGeometry(geometry)
  // const line = new LineSegments(wireframe)
  // line.material.color.set(0xbda888)
  // setTilePosition(line, event.data.key)
  // scene.add(line)
}

const workerPool = []
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
  buildPlane
}
