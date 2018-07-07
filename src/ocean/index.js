import {
  Vector4,
  Matrix4,
  Color
} from 'three'
import waterFragmentShader from './water_frag.glsl'
import waterVertexShader from './water_vert.glsl'
import underwaterFragmentShader from './underwater_frag.glsl'
import underwaterVertexShader from './underwater_vert.glsl'

const WaterShader = {

  uniforms: {

    'color': {type: 'c', value: null},
    'reflectivity': {type: 'f', value: 0},
    'surface': {type: 'f', value: 0},
    'tReflectionMap': {type: 't', value: null},
    'tRefractionMap': {type: 't', value: null},
    'tNormalMap0': {type: 't', value: null},
    'tNormalMap1': {type: 't', value: null},
    'tDepth': {type: 't', value: null},
    'textureMatrix': {type: 'm4', value: null},
    'clipToWorldMatrix': {type: 'm4', value: null},
    'config': {type: 'v4', value: new Vector4()}
  },
  vertexShader: waterVertexShader,
  fragmentShader: waterFragmentShader
}

const UnderwaterShader = {
  uniforms: {
    color: {type: 'c', value: new Color(0xffffff)},
    reflectivity: {type: 'f', value: 0.75},
    waterLevel: {type: 'f', value: 0},
    tDepth: { type: 't', value: null },
    tDiffuse: { type: 't', value: null },
    tReflectionMap: { type: 't', value: null },
    tReflectionDepth: { type: 't', value: null },
    tNormalMap0: { type: 't', value: null },
    tNormalMap1: { type: 't', value: null },

    clipToWorldMatrix: { type: 'm4', value: null },
    worldToClipMatrix: { type: 'm4', value: new Matrix4() },
    cameraPosition: {type: 'v3', value: null},
    time: {type: 'f', value: 0}
  },
  vertexShader: underwaterVertexShader,
  fragmentShader: underwaterFragmentShader
}

export {WaterShader, UnderwaterShader}
