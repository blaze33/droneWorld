import UPNG from 'upng-js'
import ndarray from 'ndarray'
import * as THREE from 'three'
import {Octree} from '../modules'
import PubSub from '../events'
import {scene} from '../index'
import * as voxel from 'voxel'
import {MaterialBasic} from '../terrain/shaders/materialBasic'

// const voxel = require('voxel')
import SimplexNoise from 'simplex-noise'

require('three/examples/js/MarchingCubes.js')

const MarchingCubes = global.THREE.MarchingCubes

const octree = new Octree({
                // uncomment below to see the octree (may kill the fps)
                // scene: scene,
                // when undeferred = true, objects are inserted immediately
                // instead of being deferred until next octree.update() call
                // this may decrease performance as it forces a matrix update
  undeferred: false,
                // set the max depth of tree
  depthMax: Infinity,
                // max number of objects before nodes split or merge
  objectsThreshold: 8,
                // percent between 0 and 1 that nodes will overlap each other
                // helps insert objects that lie over more than one node
  overlapPct: 0.15
})

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

const tilesElevationURL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium'

const pngToHeight = (array) => {
  const heightmap = new Int16Array(256 * 256)
  let ij = 0
  let rgba = 0
  let altitude
  for (let i = 0; i < 256; i++) {
    for (let j = 0; j < 256; j++) {
      ij = i + 256 * j
      rgba = ij * 4
      altitude = array[rgba] * 256.0 + array[rgba + 1] + array[rgba + 2] / 256.0 - 32768.0
      heightmap[ij] = altitude
      // if (j === 0) { console.log(heightmap[ij], altitude) }
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
    .then(array => new Uint8Array(UPNG.toRGBA8(UPNG.decode(array))[0]))
    .then(png => {
      png.heightmap = pngToHeight(png)
      return png
    })
}

let map

heightmap(10, 356, 356).then(png => {
  map = ndarray(png.heightmap, [256, 256])
  PubSub.publish('x.voxel.init', map)
})

const initMap = (msg, map) => {
  const noise = new SimplexNoise('seed')
  let noiseValue
  const positions = []
  voxel.generate([0, 0, 0], [128, 128, 128], function (x, y, z) {
    noiseValue = noise.noise3D(x / 64, y / 64, z / 64)
    if (noiseValue < -0.7) {
      positions.push(90)
    } else {
      positions.push(60)
    }
  })
  console.log(positions)

  // generate geometry
  const effect = new MarchingCubes(128, new THREE.MeshNormalMaterial(), true, true)
  effect.field = new Float32Array(positions, 3)
  effect.position.set(0, 0, 0)
  effect.scale.set(1000, 1000, 1000)

  console.log(effect)
  const geom = effect.generateGeometry()
  console.log(geom)
  geom.scale(700, 700, 700)
  geom.computeFaceNormals()
  geom.computeVertexNormals()
  scene.add(new THREE.Mesh(geom, new THREE.MeshNormalMaterial({flatShading: true, fog: false})))
  // scene.add(new THREE.Mesh(geom, MaterialBasic({}, {})))
}
PubSub.subscribe('x.voxel.init', initMap)

export {octree}
