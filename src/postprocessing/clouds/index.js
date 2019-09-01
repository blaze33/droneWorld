import {
  Matrix4,
  Vector3
} from 'three'
import fragmentShader from './clouds.frag.glsl'

const CloudsShader = {
  uniforms: {
    tDepth: { type: 't', value: null },
    tColor: { type: 't', value: null },

    cameraNear: { type: 'f', value: 1 },
    cameraFar: { type: 'f', value: 1e6 },

    clipToWorldMatrix: { type: 'm4', value: new Matrix4() },
    cameraPosition: { type: 'v3', value: new Vector3() },
    sun: { type: 'v3', value: new Vector3() }

  },

  vertexShader: `
    varying vec2 vUv;

    void main() {

      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      vUv = uv;

    }
  `,
  fragmentShader
}

export default CloudsShader
