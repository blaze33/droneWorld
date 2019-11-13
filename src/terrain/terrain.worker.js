/* eslint-env worker */

import UPNG from 'upng-js'
import { BufferGeometry } from 'three/src/core/BufferGeometry'
import { BufferAttribute } from 'three/src/core/BufferAttribute'
import { PlaneBufferGeometry } from 'three/src/geometries/PlaneGeometry'
import { crackFix } from './crackFix'

const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length

const messages = []
onmessage = message => messages.push(message)

let dem2mesh
import('./dem2mesh/pkg').then(pkg => {
  dem2mesh = pkg
  dem2mesh.init()
  onmessage = function (args) {
    const [z, x, y, segments, j, size] = args.data
    buildPlane(z, x, y, segments, j, size, args.data.toString())
  }
  messages.forEach(message => onmessage(message))
})

const tilesElevationURL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'

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
const fetchPNG = (z, x, y) => {
  [z, x, y] = offsetCoords(z, x, y)
  const tileURL = `${tilesElevationURL}/${z}/${x}/${y}.png`
  return fetch(tileURL)
    .then(res => res.arrayBuffer())
    .then(arrayBuffer => new Uint8Array(arrayBuffer))
}

const png2heightmap = (encodedPng) => {
  const png = new Uint8Array(UPNG.toRGBA8(UPNG.decode(encodedPng))[0])
  const heightmap = new Float32Array(256 * 256)
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 256; j++) {
      const ij = i + 256 * j
      const rgba = ij * 4
      heightmap[ij] = png[rgba] * 256.0 + png[rgba + 1] + png[rgba + 2] / 256.0 - 32768.0
    }
  }
  return heightmap
}

const buildGeometryA = (png, size, segments, wasm) => {
  const buildMethod = wasm ? dem2mesh.png2elevation : png2heightmap
  performance.mark('png2height-start')
  const heightmap = buildMethod(png)
  performance.mark('png2height-end')

  performance.measure('png-time', 'png2height-start', 'png2height-end')
  performance.getEntriesByName('png-time')
  const entries = performance.getEntriesByName('png-time')
  if (entries.length === 1) {
    console.log(`First PNG decoded: ${Math.round(entries[0].duration)}ms`)
  }
  if (entries.length === 12) {
    console.log(
      `${entries.length} PNG decoded: `,
      `${Math.round(average(entries.map(p => p.duration)))}ms on average`
    )
    console.log(`Last PNG decoded: ${Math.round(entries[11].duration)}ms`)
  }

  const geometry = new PlaneBufferGeometry(size, size, segments + 2, segments + 2)
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
      heightmap[Math.round(Math.round(x * ratio) * nHeightmap + y * ratio)] * 0.075
    )
  }

  // center geometry along xY for correct XY scaling in crackFix
  const z0 = geometry.attributes.position.array[2]
  geometry.center()
  const z1 = geometry.attributes.position.array[2]
  const deltaZ = z0 - z1
  geometry.translate(0, 0, deltaZ)
  // geometry.scale(1, 1, 0.75)
  crackFix(geometry)

  return geometry
}

const buildGeometryB = (png, size, segments) => {
  const geometry = new BufferGeometry()

  performance.mark('png2mesh-start')
  const [position, index, uv] = dem2mesh.png2mesh(png, size, segments)
  performance.mark('png2mesh-end')
  performance.measure('wasm-time', 'png2mesh-start', 'png2mesh-end')
  performance.getEntriesByName('wasm-time')
  console.log(
    performance.getEntriesByName('wasm-time').length,
    average(performance.getEntriesByName('wasm-time').map(p => p.duration))
  )

  geometry.setAttribute(
    'position',
    new BufferAttribute(Float32Array.from(position), 3)
  )
  geometry.setIndex(
    new BufferAttribute(Uint16Array.from(index), 1)
  )
  geometry.setAttribute(
    'uv',
    new BufferAttribute(Float32Array.from(uv), 2)
  )
  geometry.computeVertexNormals()

  return geometry
}

const buildTile = (png, size, segments, key) => {
  const buildMethods = {
    fullJS: (png, size, segments) => buildGeometryA(png, size, segments, false),
    wasmPNG: (png, size, segments) => buildGeometryA(png, size, segments, true),
    fullWASM: buildGeometryB
  }
  // const buildMethod = buildMethods['fullJS']
  const buildMethod = buildMethods.wasmPNG
  // const buildMethod = buildMethods['fullWASM']

  // console.time(key)

  const geometry = buildMethod(png, size, segments)

  const positions = geometry.attributes.position.array.buffer
  const normals = geometry.attributes.normal.array.buffer
  const indices = geometry.index.array.buffer
  const uvs = geometry.attributes.uv.array.buffer
  // console.timeEnd(key)
  postMessage({
    key,
    positions,
    normals,
    indices,
    uvs,
    bpe: {
      positions: geometry.attributes.position.array.BYTES_PER_ELEMENT,
      normals: geometry.attributes.normal.array.BYTES_PER_ELEMENT,
      indices: geometry.index.array.BYTES_PER_ELEMENT
    }
  }, [positions, normals, indices, uvs])
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
  fetchPNG(z, x, y).then(png => {
    buildTile(png, size, segments, key)
  })
}
