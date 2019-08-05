/* eslint-env worker */

import { PlaneBufferGeometry } from 'three/src/geometries/PlaneGeometry'
import UPNG from 'upng-js'
// import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js'
import { crackFix } from './crackFix'

const messages = []
onmessage = message => messages.push(message)

let dem2mesh
import('./dem2mesh/pkg').then(pkg => {
  dem2mesh = pkg
  onmessage = function (args) {
    const [z, x, y, segments, j, size] = args.data
    buildPlane(z, x, y, segments, j, size, args.data.toString())
  }
  messages.forEach(message => onmessage(message))
})

const tilesElevationURL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'
// const simple = new SimplifyModifier()

const pngToHeight = (array) => {
  const heightmap = new Float32Array(256 * 256)
  for (let i = 0, j = array.length; i < j; i += 4) {
    heightmap[i / 4] = array[i] * 256.0 + array[i + 1] + array[i + 2] / 256.0 - 32768.0
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
  if (isNaN(z) || isNaN(x) || isNaN(y)) {
    throw new Error(`cannot fetch tile ${z}/${x}/${y}.png`)
  }
  return [z, x, y]
}
const heightmap = (z, x, y) => {
  [z, x, y] = offsetCoords(z, x, y)
  const tileURL = `${tilesElevationURL}/${z}/${x}/${y}.png`
  return fetch(tileURL)
    .then(res => res.arrayBuffer())
    .then(array => {
      const t0 = Date.now()
      const retwasm = dem2mesh.png2mesh(new Uint8Array(array))
      const t1 = Date.now()
      const retjs = pngToHeight(new Uint8Array(UPNG.toRGBA8(UPNG.decode(array))[0]))
      const t2 = Date.now()
      postMessage({stats: true, wasm: t1-t0, js: t2-t1})
      return retwasm
    })
}

const setHeightmap = (geometry, heightmap, scale, offset, key) => {
  if (!geometry) { return }
  const nPosition = Math.sqrt(geometry.attributes.position.count)
  const nHeightmap = Math.sqrt(heightmap.length)
  const ratio = nHeightmap / (nPosition)
  let x, y
  for (let i = nPosition; i < geometry.attributes.position.count - nPosition; i++) {
    if (
      i % (nPosition) === 0 ||
      i % (nPosition) === nPosition - 1
    ) continue
    x = Math.floor(i / (nPosition))
    y = i % (nPosition)
    geometry.attributes.position.setZ(
      i,
      heightmap[Math.round(Math.round(x * ratio) * nHeightmap + y * ratio)] * scale + offset
    )
  }

  // center geometry along xY for correct XY scaling in crackFix
  const z0 = geometry.attributes.position.array[2]
  geometry.center()
  const z1 = geometry.attributes.position.array[2]
  const deltaZ = z0 - z1
  geometry.translate(0, 0, deltaZ)
  geometry.scale(1, 1, 0.75)
  crackFix(geometry)

  // dem2mesh.greet()
  // const target = Math.floor(geometry.attributes.position.count * 0.4)
  // geometry = simple.modify(geometry, target)
  // geometry.computeVertexNormals()

  const positions = geometry.attributes.position.array.buffer
  const normals = geometry.attributes.normal.array.buffer
  const indices = geometry.index.array.buffer
  postMessage({
    key,
    positions,
    normals,
    indices,
    bpe: {
      positions: geometry.attributes.position.array.BYTES_PER_ELEMENT,
      normals: geometry.attributes.normal.array.BYTES_PER_ELEMENT,
      indices: geometry.index.array.BYTES_PER_ELEMENT
    }
  }, [positions, normals, indices])
}

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

const buildPlane = (z, x, y, segments, j, size, key) => {
  const geometry = new PlaneBufferGeometry(size, size, segments + 2, segments + 2)
  // const geometry = new PlaneBufferGeometry( size, size, 4, 4);

  heightmap(z, x, y).then(heightmap => {
    setHeightmap(geometry, heightmap, 0.1, 0, key)
  })
}
