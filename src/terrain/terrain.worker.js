/* eslint-env worker */

import { BufferGeometry } from 'three/src/core/BufferGeometry'
import { BufferAttribute } from 'three/src/core/BufferAttribute'

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

const buildTile = (png, size, segments, key) => {
  let geometry = new BufferGeometry()
  let position
  let index

  [position, index] = dem2mesh.png2mesh(png, size, segments)

  geometry.addAttribute(
    'position',
    new BufferAttribute(Float32Array.from(position), 3)
  )
  geometry.setIndex(
    new BufferAttribute(Uint16Array.from(index), 1)
  )
  geometry.computeVertexNormals()

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
  fetchPNG(z, x, y).then(png => {
    buildTile(png, size, segments, key)
  })
}
