import {
  ShaderMaterial,
  TextureLoader,
  RepeatWrapping,
  UniformsLib,
  Matrix3
} from 'three'
import vertexShader from './terrain_tile.vert.glsl'
import fragmentShader from './terrain_tile.frag.glsl'

const textureLoader = new TextureLoader().setCrossOrigin('anonymous')

const rockTexture = textureLoader.load(require('../textures/Rock_08_UV_H_CM_1.jpg'))
const rockTextureNormal = textureLoader.load(require('../textures/Rock_08_UV_H_CM_1_normal.jpg'))
// const rockTexture = textureLoader.load(require('../textures/rock_brown_1600.jpg'))
const grassTexture = textureLoader.load(require('../textures/GrassGreenTexture_1024.jpg'))
const grassTextureNormal = textureLoader.load(require('../textures/GrassGreenTexture_1024_normal.jpg'))
// const grassTexture = textureLoader.load(require('../textures/rainforest512.jpg'))
// const grassTexture2 = textureLoader.load(require('../textures/Grass_01_UV_H_CM_1.jpg'))
// const icyTexture = textureLoader.load(require('../textures/snow_scuffed_ground_1.jpg'))
// const snowTexture = textureLoader.load(require('../textures/Snow_01_UV_H_CM_1.jpg'))
// const envmapTexture = textureLoader.load(require('../textures/envmap.jpg'))
rockTexture.wrapS = rockTexture.wrapT = RepeatWrapping
rockTexture.offset.set(0, 0)
rockTexture.repeat.set(20, 20)
rockTextureNormal.wrapS = rockTextureNormal.wrapT = RepeatWrapping
grassTexture.wrapS = grassTexture.wrapT = RepeatWrapping
grassTextureNormal.wrapS = grassTextureNormal.wrapT = RepeatWrapping
// grassTexture.offset.set(0, 0);
// grassTexture.repeat.set( 20, 20 );
// grassTexture2.wrapS = grassTexture2.wrapT = RepeatWrapping
// icyTexture.wrapS = icyTexture.wrapT = RepeatWrapping
// snowTexture.wrapS = snowTexture.wrapT = RepeatWrapping

const MaterialBasic = (options, uniforms) => {
  const material = new ShaderMaterial({
    uniforms: {
      // opacity: {value: 1.0},
      // clearCoat: {value: 0.0},
      // clearCoatRoughness: {value: 0.0},
      roughness: { value: 0.7 },
      metalness: { value: 0.0 },
      ...UniformsLib.common,
      ...UniformsLib.lights,
      // ...UniformsLib.specularMap,
      ...UniformsLib.envmap,
      // ...UniformsLib.aomap,
      // ...UniformsLib.lightmap,
      // ...UniformsLib.emissivemap,
      // ...UniformsLib.bumpmap,
      ...UniformsLib.normalmap,
      // ...UniformsLib.displacementmap,
      // ...UniformsLib.roughnessmap,
      // ...UniformsLib.metalnessmap,
      // ...UniformsLib.gradientmap,
      ...UniformsLib.fog,
      // ...UniformsLib.points,
      // spectral: {value: spectralTexture},
      rockTexture: { value: rockTexture },
      rockTextureNormal: { value: rockTextureNormal },
      // grassTexture: {value: grassTexture},
      // grassTextureNormal: {value: grassTextureNormal},
      // icyTexture: {value: icyTexture},
      // snowTexture: {value: snowTexture},
      // sunPosition: {value: sunPosition},
      ...uniforms
    },
    defines: {
      STANDARD: '',
      USE_MAP: '',
      USE_UV: '',
      // USE_ENVMAP: '',
      USE_NORMALMAP: ''
      // TONE_MAPPING: ''
      // FLAT_SHADED: '',
    },
    vertexShader,
    fragmentShader,
    extensions: {
      derivatives: true
    },
    wireframe: false,
    lights: true,
    fog: true
    // transparent: true,
    // ...options,
  })
  material.uniforms.map.value = grassTexture
  material.uniforms.normalMap.value = grassTextureNormal
  // material.uniforms.envMap.value = envmapTexture
  // material.uniforms.toneMappingExposure = {value: 3}
  // material.uniforms.toneMappingWhitePoint = {value: 5}
  // material.uniforms.normalScale = {value: 5}
  // material.opacity = 1.0
  material.roughness = 0.7
  material.metalness = 0
  // material.lightMapIntensity = 1.0
  // material.aoMapIntensity = 1.0
  // material.emissiveIntensity = 1.0
  // material.envMapIntensity = 1
  // material.refractionRatio = 0.98
  // material.bumpscale = 1.0
  // material.normalScale = new Vector2(5, 5)
  // material.uniforms.reflectivity.value = 0.5
  // material.clearCoatRoughness = 0.0

  // needed for WebGLProgram to unroll loops
  // cf. https://github.com/mrdoob/three.js/pull/12323
  material.isShaderMaterial = false
  material.isMeshStandardMaterial = true
  // material.isMeshPhysicalMaterial = true
  // repeat the texture 20 times
  material.uniforms.uvTransform.value = new Matrix3().multiplyScalar(20)

  material.needsUpdate = true
  return material
}

export { MaterialBasic }
