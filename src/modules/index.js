import * as THREE from 'three'

global.THREE = THREE

require('three/examples/js/loaders/GLTFLoader')
require('three/examples/js/objects/Sky.js')
require('three/examples/js/Octree.js')

const GLTFLoader = global.THREE.GLTFLoader
const Sky = global.THREE.Sky
const Octree = global.THREE.Octree

export {
  GLTFLoader,
  Sky,
  Octree
}
