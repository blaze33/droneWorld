import * as THREE from 'three'

global.THREE = THREE

require('three/examples/js/loaders/GLTFLoader')
require('three/examples/js/objects/Sky.js')

const GLTFLoader = global.THREE.GLTFLoader
const Sky = global.THREE.Sky

export {
  GLTFLoader,
  Sky
}
