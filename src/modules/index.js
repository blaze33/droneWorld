import * as THREE from 'three'

global.THREE = THREE

require('three/examples/js/loaders/GLTFLoader')
require('three/examples/js/objects/Sky.js')

require('three/examples/js/Octree.js')

require('three/examples/js/objects/Lensflare.js')

require('three/examples/js/objects/Reflector.js')
require('three/examples/js/objects/Refractor.js')
require('three/examples/js/objects/Water2.js')

require('three/examples/js/shaders/BokehShader2.js')
require('three/examples/js/shaders/CopyShader.js')
require('three/examples/js/shaders/BlendShader.js')
require('three/examples/js/shaders/WaterRefractionShader.js')
require('three/examples/js/postprocessing/EffectComposer.js')
require('three/examples/js/postprocessing/ShaderPass.js')
require('three/examples/js/postprocessing/RenderPass.js')
require('three/examples/js/postprocessing/SavePass.js')
require('three/examples/js/shaders/DigitalGlitch.js')
require('three/examples/js/postprocessing/GlitchPass.js')

require('three/examples/js/modifiers/SimplifyModifier.js')

require('three/examples/js/MarchingCubes.js')

const GLTFLoader = global.THREE.GLTFLoader
const Sky = global.THREE.Sky

const Octree = global.THREE.Octree
const BlendShader = global.THREE.BlendShader
const CopyShader = global.THREE.CopyShader
const WaterRefractionShader = global.THREE.WaterRefractionShader

const BokehShader = global.THREE.BokehShader
const EffectComposer = global.THREE.EffectComposer
const ShaderPass = global.THREE.ShaderPass
const RenderPass = global.THREE.RenderPass
const SavePass = global.THREE.SavePass
const GlitchPass = global.THREE.GlitchPass

const Lensflare = global.THREE.Lensflare
const LensflareElement = global.THREE.LensflareElement

const Reflector = global.THREE.Reflector
const Refractor = global.THREE.Refractor
const Water = global.THREE.Water

const SimplifyModifier = global.THREE.SimplifyModifier

const MarchingCubes = global.THREE.MarchingCubes

export {
  GLTFLoader,
  Sky,
  Octree,
  BlendShader,
  CopyShader,
  WaterRefractionShader,

  BokehShader,
  EffectComposer,
  ShaderPass,
  RenderPass,
  SavePass,
  GlitchPass,

  Lensflare,
  LensflareElement,

  Reflector,
  Refractor,
  Water,

  SimplifyModifier,

  MarchingCubes
}
