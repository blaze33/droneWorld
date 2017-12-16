import {
  TextureLoader,
  ShaderMaterial,
  Vector2,
  Vector3,
  MeshPhongMaterial,
  PlaneBufferGeometry,
  Mesh,
  BufferAttribute,
  BufferGeometry,
  VertexNormalsHelper,
  DataTexture,
  RGBFormat,
  LinearFilter,
} from 'three'
import {Plane} from 'whs'
import UPNG from 'upng-js'
import {scene} from '../index'
// import SimplifyModifier from '../modules/meshSimplify'
import vertexShader from './shaders/terrain.vert'
import fragmentShader from './shaders/terrain.frag'
import whiteShader from './shaders/white.frag'
import identityShader from './shaders/white.vert'
import Worker from './terrain.worker.js';

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
      derivatives: true,
    },
    wireframe: true,
    ...options,
  });
}

const spectralMaterial = (options, uniforms) => {
  return new ShaderMaterial({
    uniforms: {
      spectral: {value: spectralTexture},
      ...uniforms
    },
    vertexShader: identityShader,
    fragmentShader: fragmentShader,
    extensions: {
      derivatives: true,
    },
    wireframe: false,
    // ...options,
  })
}
const spectralMaterialInstance = spectralMaterial()

// const wireMaterial = (z, x, y, options) => {
//   return new ShaderMaterial({
//     uniforms: {
//       ...heightMapUniform(z, x, y),
//       spectral: spectralTexture
//     },
//     vertexShader,
//     fragmentShader: whiteShader,
//     extensions: {
//       derivatives: true,
//     },
//     wireframe: true,
//     ...options,
//   });
// }

const tilePosition = (z, x, y, i, j, size) => {
  let position = new Vector3(
    (x - 330 ) * 800 + i * size + size / 2,
    -(y - 790) * 800 + j * size - 800 + size / 2,
    0
  )
  return position
}

const buildTile = (z, x, y, i, j, size, segments, terrainOptions) => {
  const position = tilePosition(z, x, y, i, j, size)
  const zxyTex = [z, x, y]
  const plane = new Plane({
    geometry: {
      width: size,
      height: size,
      wSegments: segments,
      hSegments: segments,
      buffer: true
    },
    position,
  })
  const material = terrainMaterial(...zxyTex, terrainOptions, {
    ijs: {value: new Vector3(i, j, size)},
    tileSize: {value: 800}
  })
  plane.material = material
  return plane
}

// ############################################
const tileSize = 800
const pngToHeight = (array) => {
  const heightmap = new Float32Array(256 * 256)
  for (let i=0; i<256;i++) {
    for (let j=0; j<256;j++) {
      const ij = i + 256 * j
      const rgba = ij * 4
      heightmap[ij] = array[rgba] * 256.0 + array[rgba + 1] + array[rgba + 2] / 256. - 32768.0
    }
  }
  return heightmap
}
const offsetCoords = (z, x, y) => {
  const maxTile = Math.pow(2, z)
  const offset = offsetAtZ(z)
  const fetchedX = Math.floor(x + offset.x)
  const fetchedY = Math.floor(y + offset.y)
  x = Math.abs(fetchedX % maxTile)
  y = Math.abs(fetchedY % maxTile)
  return [z, x, y]
}
const heightmap = (z, x, y) => {
  [z, x, y] = offsetCoords(z, x, y)
  const tileURL = `${tilesElevationURL}/${z}/${x}/${y}.png`
  return window.fetch(tileURL)
    .then(res => res.arrayBuffer())
    .then(array => new Uint8Array(UPNG.toRGBA8(UPNG.decode(array))[0]))
    .then(png => {
      png.heightmap = pngToHeight(png)
      return png
    })
}
window.heightmap = heightmap

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
  const zxyijs = key.split(',').map(x => parseInt(x))
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

const buildTileFromWorker = event => {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(event.data.positions)
  const normals = new Float32Array(event.data.normals)
  const indexArrayClass = {
    2: Uint16Array,
    4: Uint32Array
  }[event.data.bpe.indices]
  const index = new indexArrayClass(event.data.indices)
  const dem = new Uint8Array(event.data.dem)
  let uv = new Float32Array(positions.length / 3 * 2)
  const n = Math.sqrt(positions.length / 3)
  uv = uv.map((_, index) => index % 2 ? Math.floor((index / 2) / n) /n : (index / 2) % n /  n)
  geometry.addAttribute('position', new BufferAttribute(positions, 3))
  geometry.addAttribute('normal', new BufferAttribute(normals, 3))
  geometry.addAttribute('uv', new BufferAttribute(uv, 2))
  geometry.setIndex(new BufferAttribute(index, 1))
  // geometry.computeVertexNormals()

  const heightTexture = new DataTexture(dem, 256, 256, RGBFormat)
  heightTexture.anisotropy = 1
  heightTexture.minFilter = LinearFilter
  heightTexture.magFilter = LinearFilter
  heightTexture.needsUpdate = true
  const material = spectralMaterial({}, {heightmap: {value: heightTexture}})
  const plane = new Mesh( geometry, material );

  plane.key = event.data.key
  plane.castShadow = true; //default is false
  plane.receiveShadow = true;
  setTilePosition(plane, event.data.key)
  scene.add(plane)
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

const setHeightmap = (plane, heightmap, scale, offset) => {
  if (!plane.geometry) {return}
  const nPosition = plane.geometry.parameters.heightSegments + 1
  const nHeightmap = Math.sqrt(heightmap.length)
  const ratio = nHeightmap / nPosition
  let x, y
  for (let i=0;i<plane.geometry.attributes.position.count;i++) {
    x = Math.floor(i / nPosition)
    y = i % nPosition
    plane.geometry.attributes.position.setZ(i, heightmap[x * ratio * nHeightmap + Math.floor(y * ratio) - offset] * scale)
  }
  plane.geometry.computeVertexNormals()
  // tessellateTile(plane)
  // const tessellator = new SimplifyModifier()
  // console.log(tessellator)
  // // plane.geometry.dispose()
  // plane.geometry = tessellator.modify(plane.geometry)
  plane.geometry.attributes.position.needsUpdate = true
  // plane.geometry.needUpdate = true
}

const tessellateTile = (plane) => {
  const normals = plane.geometry.attributes.normal.array
  const n = Math.sqrt(plane.geometry.attributes.normal.count)
  let angles = new Float32Array(n * n)
  const idx = (i, j) => (i * n + j) * 3 
  for (let i=0;i<n;i++) {
    for (let j=0;j<n;j++) {
      const index = idx(i, j)
      const normal = new Vector3(normals[index], normals[index + 1], normals[index + 2])
      const neighbours = [
        new Vector3(normals[idx(i - 1, j - 1)], normals[idx(i - 1, j - 1) + 1], normals[idx(i - 1, j - 1) + 2]),
        new Vector3(normals[idx(i - 1, j)], normals[idx(i - 1, j) + 1], normals[idx(i - 1, j) + 2]),
        new Vector3(normals[idx(i - 1, j + 1)], normals[idx(i - 1, j + 1) + 1], normals[idx(i - 1, j + 1) + 2]),
        new Vector3(normals[idx(i, j - 1)], normals[idx(i, j - 1) + 1], normals[idx(i, j - 1) + 2]),
        new Vector3(normals[idx(i, j + 1)], normals[idx(i, j + 1) + 1], normals[idx(i, j + 1) + 2]),
        new Vector3(normals[idx(i + 1, j - 1)], normals[idx(i + 1, j - 1) + 1], normals[idx(i + 1, j - 1) + 2]),
        new Vector3(normals[idx(i + 1, j)], normals[idx(i + 1, j) + 1], normals[idx(i + 1, j) + 2]),
        new Vector3(normals[idx(i + 1, j + 1)], normals[idx(i + 1, j + 1) + 1], normals[idx(i + 1, j + 1) + 2]),
      ]
      const angularity = neighbours.reduce((angle, vector) => Math.abs(angle + normal.angleTo(vector)), 0)
      angles[i * n + j] = angularity
    }
  }
  const angle = new BufferAttribute(angles, 1)
  plane.geometry.addAttribute('angle', angle)
  const nonIndexedGeometry = plane.geometry.toNonIndexed()
  console.log(nonIndexedGeometry)
  const geometry = new BufferGeometry()
  const curvatureFilter = (element, idx) => nonIndexedGeometry.attributes.angle.array[idx] > 1
  const curvatureFilter3 = (element, idx) => nonIndexedGeometry.attributes.angle.array[~~(idx / 3)] > 1
  const vertices = new Float32Array(
    nonIndexedGeometry.attributes.position.array.filter(curvatureFilter3)
  )
  geometry.addAttribute('position', new BufferAttribute(vertices, 3));
  geometry.addAttribute('angle', new BufferAttribute(nonIndexedGeometry.attributes.angle.array.filter(curvatureFilter), 1));
  plane.geometry.dispose()
  plane.geometry = geometry
  plane.geometry.computeVertexNormals()
}


export {
    heightMapTexture,
    spectralTexture,
    buildTile,
    heightmap,
    spectralMaterial,
    buildPlane,
}