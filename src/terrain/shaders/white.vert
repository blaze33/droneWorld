varying float height;
varying vec3 pos;
varying vec3 vNormal;
attribute float angle;
uniform vec3 sunPosition;
varying float ang;
varying vec2 UV;
varying vec3 vViewPosition;
varying float depth;
varying vec3 vSunPosition;

@import three/src/renderers/shaders/ShaderChunk/shadowmap_pars_vertex;

mat3 inverse(mat3 m) {
  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];
  float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];
  float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];

  float b01 = a22 * a11 - a12 * a21;
  float b11 = -a22 * a10 + a12 * a20;
  float b21 = a21 * a10 - a11 * a20;

  float det = a00 * b01 + a01 * b11 + a02 * b21;

  return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),
              b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),
              b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;
}

mat3 transpose(mat3 m) {
  return mat3(m[0][0], m[1][0], m[2][0],
              m[0][1], m[1][1], m[2][1],
              m[0][2], m[1][2], m[2][2]);
}


void main() {
  height = position.z * 20.0;
  vec4 mpos = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mpos;
  pos = -mpos.xyz;

  // mat3 normalMatrix = transpose(inverse(mat3(modelViewMatrix)));
  // vNormal = normalize(normalMatrix * normal);
  vNormal = normal;

  ang = angle;
  UV = uv;
  vViewPosition = mpos.xyz;
  vSunPosition = sunPosition;
  // DEPTH
  depth = clamp(gl_Position.z / 2500.0, 0.0, 0.7);

  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  @import three/src/renderers/shaders/ShaderChunk/shadowmap_vertex;
}