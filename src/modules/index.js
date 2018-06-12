import * as THREE from 'three'

global.THREE = THREE

require('three/examples/js/loaders/GLTFLoader')
require('three/examples/js/objects/Sky.js')
require('three/examples/js/Octree.js')

require('three/examples/js/objects/Lensflare.js')

const GLTFLoader = global.THREE.GLTFLoader
const Sky = global.THREE.Sky
const Octree = global.THREE.Octree

const Lensflare = global.THREE.Lensflare
const LensflareElement = global.THREE.LensflareElement

export {
  GLTFLoader,
  Sky,
  Octree

  Lensflare,
  LensflareElement
}
