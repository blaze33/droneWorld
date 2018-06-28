import * as THREE from 'three'

global.THREE = THREE

require('three/examples/js/loaders/GLTFLoader')
require('three/examples/js/objects/Sky.js')
require('three/examples/js/Octree.js')

require('three/examples/js/objects/Lensflare.js')

require('three/examples/js/shaders/BokehShader2.js')
require('three/examples/js/shaders/CopyShader.js')
require('three/examples/js/shaders/BlendShader.js')
require('three/examples/js/postprocessing/EffectComposer.js')
require('three/examples/js/postprocessing/ShaderPass.js')
require('three/examples/js/postprocessing/RenderPass.js')
require('three/examples/js/postprocessing/SavePass.js')
require('three/examples/js/shaders/DigitalGlitch.js')
require('three/examples/js/postprocessing/GlitchPass.js')

require('three/examples/js/modifiers/SimplifyModifier.js')

const GLTFLoader = global.THREE.GLTFLoader
const Sky = global.THREE.Sky
const Octree = global.THREE.Octree
const BlendShader = global.THREE.BlendShader
const CopyShader = global.THREE.CopyShader

const BokehShader = global.THREE.BokehShader
const EffectComposer = global.THREE.EffectComposer
const ShaderPass = global.THREE.ShaderPass
const RenderPass = global.THREE.RenderPass
const SavePass = global.THREE.SavePass
const GlitchPass = global.THREE.GlitchPass

const Lensflare = global.THREE.Lensflare
const LensflareElement = global.THREE.LensflareElement

const SimplifyModifier = global.THREE.SimplifyModifier

export {
  GLTFLoader,
  Sky,
  Octree,
  BlendShader,
  CopyShader,

  BokehShader,
  EffectComposer,
  ShaderPass,
  RenderPass,
  SavePass,
  GlitchPass,

  Lensflare,
  LensflareElement,

  SimplifyModifier
}
