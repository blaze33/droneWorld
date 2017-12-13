import {
  TextureLoader,
  Vector2,
  Vector3,
  PlaneBufferGeometry,
} from 'three'
import UPNG from 'upng-js'
import SimplifyModifier from '../modules/meshSimplify'
import {crackFix} from './crackFix'

const tilesElevationURL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'

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
  return fetch(tileURL)
    .then(res => res.arrayBuffer())
    .then(array => new Uint8Array(UPNG.toRGBA8(UPNG.decode(array))[0]))
    .then(png => {
      png.heightmap = pngToHeight(png)
      return png
    })
}
const setHeightmap = (geometry, heightmap, scale, offset, key) => {
  if (!geometry) {return}
  const nPosition = geometry.parameters.heightSegments + 1
  const nHeightmap = Math.sqrt(heightmap.length)
  const ratio = nHeightmap / nPosition
  let x, y
  // for (let i=0;i<geometry.attributes.position.count;i++) {
  //   x = Math.floor(i / nPosition)
  //   y = i % nPosition
  //   geometry.attributes.position.setZ(i, heightmap[Math.floor(x * ratio * nHeightmap + y * ratio - offset)] * scale + offset)
  // }
  console.log(heightmap)
  for (let i=1;i<nPosition-1;i++) {
    for (let j=1;j<nPosition-1;j++) {
      x = (i - 1) / (nPosition - 2)
      y = (j - 1) / (nPosition - 2)
      geometry.attributes.position.setZ(
        i * nPosition + j,
        heightmap[Math.floor(Math.floor(x * nHeightmap) * nHeightmap + y * nHeightmap)] * scale + offset
      )
    }
  }

  // center geometry along xY for correct XY scaling in crackFix
  const z0 = geometry.attributes.position.array[2]
  geometry.center()
  const z1 = geometry.attributes.position.array[2]
  const deltaZ = z0- z1
  geometry.translate(0, 0, deltaZ)

  crackFix(geometry)

  // geometry.computeVertexNormals()
  // tessellateTile(plane)
  // const tessellator = new SimplifyModifier()
  // geometry = tessellator.modify(geometry)
  // geometry.attributes.position.needsUpdate = true
  // geometry.needUpdate = true
  const positions = geometry.attributes.position.array.buffer
  const indices = geometry.index.array.buffer
  postMessage({
    key,
    positions, indices,
    bpe: {
      positions: geometry.attributes.position.array.BYTES_PER_ELEMENT,
      indices: geometry.index.array.BYTES_PER_ELEMENT,
    },
  }, [positions, indices])
}

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

const buildPlane = (z, x, y, segments, j, size, key) => {
  const geometry = new PlaneBufferGeometry( size, size, segments, segments);
  // const geometry = new PlaneBufferGeometry( size, size, 4, 4);

  heightmap(z, x, y).then(parsedPng => {
    setHeightmap(geometry, parsedPng.heightmap, 0.1, 0, key)
  });
}

onmessage = function(args) {
  const [z, x, y, segments, j, size] = args.data
  buildPlane(z, x, y, segments, j, size, args.data.toString())
}