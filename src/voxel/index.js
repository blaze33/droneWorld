import UPNG from 'upng-js'
import ndarray from 'ndarray'
import * as THREE from 'three'
import {Octree} from '../modules'
import PubSub from '../events'
import {scene} from '../index'
import * as voxel from 'voxel'
import * as VoxelMesh from 'voxel-mesh'
import {GreedyMesh} from './greedy'
// const voxel = require('voxel')
import SimplexNoise from 'simplex-noise'
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

const vertexShader = `precision highp float;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    attribute vec3 position;
    attribute vec3 offset;
    attribute vec2 uv;
    attribute vec4 orientation;
    attribute vec3 color;
    varying vec3 color2;
    varying vec2 vUv;
    void main() {
      vec3 vPosition = position;
      vec3 vcV = cross( orientation.xyz, vPosition );
      vPosition = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + vPosition );
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( offset + vPosition, 1.0 );
      color2 = color;
    }`

const fragmentShader = `precision highp float;
    uniform sampler2D map;
    varying vec2 vUv;
    varying vec3 color2;
    void main() {
      // gl_FragColor = texture2D( map, vUv );
      gl_FragColor.rgb = color2;
      gl_FragColor.a = 1.0;
    }`

const initMap = (msg, map) => {
  console.log(map)
  const generator = (i, j, k) => {
    return Math.random() < 0.1 ? Math.random() * 0xffffff : 0
  }
  const noise = new SimplexNoise('seed')
  let noiseValue
  const positions = []
  const orientations = []
  const colors = []
  const voxels = voxel.generate([0, 0, 0], [64, 64, 64], function (x, y, z) {
    noiseValue = noise.noise3D(x / 32, y / 32, z / 32)
    if (noiseValue < -0.7) {
      positions.push(x, y, z)
      orientations.push(0, 0, 0, 0)
      colors.push(...(new THREE.Color(Math.random() * 0xffffff).toArray()))
    }
    // return noiseValue < -0.7 ? Math.random() * 0xffffff : 0
  })
  console.log(colors)

  // scene.add(mesh)

  const geometry = new THREE.InstancedBufferGeometry()
  var bufferGeometry = new THREE.BoxBufferGeometry(2, 2, 2)
  geometry.index = bufferGeometry.index
  geometry.attributes.position = bufferGeometry.attributes.position
  geometry.attributes.uv = bufferGeometry.attributes.uv
  // geometry.maxInstancedCount = 10 // set so its initalized for dat.GUI, will be set in first draw otherwise

  const offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(positions), 3)
  const orientationAttribute = new THREE.InstancedBufferAttribute(new Float32Array(orientations), 4)

  geometry.addAttribute('offset', offsetAttribute)
  geometry.addAttribute('orientation', orientationAttribute)
  geometry.addAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 3))
  console.log(geometry)
  var material = new THREE.RawShaderMaterial({

    uniforms: {
      map: { value: new THREE.TextureLoader().load(require('../textures/crate-texture-128.jpg')) }
    },
    vertexShader,
    fragmentShader

  })
  var mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)
}
PubSub.subscribe('x.voxel.init', initMap)

export {octree}
