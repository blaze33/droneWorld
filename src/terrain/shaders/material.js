import {
  ShaderMaterial,
  TextureLoader,
  RepeatWrapping,
  UniformsLib,
  MeshPhysicalMaterial,
  Vector2,
  Matrix3,
} from 'three'
import vertexShader from './meshphysical_vert.glsl'
import fragmentShader from './meshphysical_frag.glsl'
import {sunPosition} from '../../index'

const textureLoader = new TextureLoader().setCrossOrigin("anonymous")

const rockTexture = textureLoader.load(require('../../textures/Rock_08_UV_H_CM_1.jpg'))
const rockTextureNormal = textureLoader.load(require('../../textures/Rock_08_UV_H_CM_1_normal.jpg'))
// const rockTexture = textureLoader.load(require('../../textures/rock_brown_1600.jpg'))
const grassTexture = textureLoader.load(require('../../textures/GrassGreenTexture0003.png'))
const grassTextureNormal = textureLoader.load(require('../../textures/GrassGreenTexture0003_normal.png'))
// const grassTexture = textureLoader.load(require('../../textures/rainforest512.jpg'))
const grassTexture2 = textureLoader.load(require('../../textures/Grass_01_UV_H_CM_1.jpg'))
const icyTexture = textureLoader.load(require('../../textures/snow_scuffed_ground_1.jpg'))
const snowTexture = textureLoader.load(require('../../textures/Snow_01_UV_H_CM_1.jpg'))
const envmapTexture = textureLoader.load(require('../../textures/envmap.jpg'))
rockTexture.wrapS = rockTexture.wrapT = RepeatWrapping
rockTexture.offset.set(0, 0);
rockTexture.repeat.set( 20, 20 );
rockTextureNormal.wrapS = rockTextureNormal.wrapT = RepeatWrapping
grassTexture.wrapS = grassTexture.wrapT = RepeatWrapping
grassTextureNormal.wrapS = grassTextureNormal.wrapT = RepeatWrapping
grassTexture2.wrapS = grassTexture2.wrapT = RepeatWrapping
icyTexture.wrapS = icyTexture.wrapT = RepeatWrapping
snowTexture.wrapS = snowTexture.wrapT = RepeatWrapping

const Material = (options, uniforms) => {
  const material = new ShaderMaterial({
    uniforms: {
      opacity: {value: 1.0},
      clearCoat: {value: 0.0},
      clearCoatRoughness: {value: 0.0},
      roughness: {value: 0.0},
      metalness: {value: 0.0},
      ...UniformsLib.common,
      ...UniformsLib.lights,
      ...UniformsLib.specularMap,
      ...UniformsLib.envmap,
      ...UniformsLib.aomap,
      ...UniformsLib.lightmap,
      ...UniformsLib.emissivemap,
      ...UniformsLib.bumpmap,
      ...UniformsLib.normalmap,
      ...UniformsLib.displacementmap,
      ...UniformsLib.roughnessmap,
      ...UniformsLib.metalnessmap,
      ...UniformsLib.gradientmap,
      ...UniformsLib.fog,
      ...UniformsLib.points,
      // spectral: {value: spectralTexture},
      rockTexture: {value: rockTexture},
      rockTextureNormal: {value: rockTextureNormal},
      // grassTexture: {value: grassTexture},
      // grassTextureNormal: {value: grassTextureNormal},
      // icyTexture: {value: icyTexture},
      // snowTexture: {value: snowTexture},
      // sunPosition: {value: sunPosition},
      ...uniforms
    },
    defines: {
      PHYSICAL: '',
      USE_MAP: '',
      USE_NORMALMAP: '',
      USE_ENVMAP: '',
      ENVMAP_TYPE_SPHERE: '',
      TONE_MAPPING: ''
    },
    vertexShader,
    fragmentShader,
    extensions: {
      derivatives: true,
    },
    wireframe: false,
    lights: true,
    // transparent: true,
    // ...options,
  })
  material.uniforms.map.value = grassTexture
  material.uniforms.normalMap.value = grassTextureNormal
  material.uniforms.envMap.value = envmapTexture
  material.uniforms.toneMappingExposure = {value: 3}
  material.uniforms.toneMappingWhitePoint = {value: 5}
  material.opacity = 1.0
  material.roughness = 1.0
  material.metalness = 0.0
  material.lightMapIntensity = 1.0
  material.aoMapIntensity = 1.0
  material.emissiveIntensity = 1.0
  material.envMapIntensity = 0.4
  material.refractionRatio = 0.98
  material.bumpscale = 1.0
  material.normalScale = new Vector2(1, 1)
  material.uniforms.reflectivity.value = 0.3
  material.clearCoatRoughness = 0.0
  material.isMeshStandardMaterial = true
  material.isMeshPhysicalMaterial = true

  // repeat the texture 20 times
  material.uniforms.uvTransform.value = new Matrix3().multiplyScalar(20)

  material.needsUpdate = true
  return material
}

export {Material}
