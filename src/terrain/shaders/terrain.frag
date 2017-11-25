precision mediump float;
// #pragma glslify: faceNormals = require('glsl-face-normal')
uniform float bFlat;
uniform sampler2D spectral;
varying vec3 vNormal;
varying vec3 pos;
varying float height;
const vec3 lightPos   = vec3(100,100,50);
const vec3 specColor  = vec3(1.0, 1.0, 1.0);

vec3 normals(vec3 pos) {
  vec3 fdx = dFdx(pos);
  vec3 fdy = dFdy(pos);
  return normalize(cross(fdx, fdy));
}


void main() {
  vec3 normal = mix(vNormal, normals(pos), bFlat);
  // vec3 vNormal = faceNormals(pos);
  // gl_FragColor = vec4(vNormal, 1.0);

  vec3 lightDir = normalize(lightPos - pos);
  float lambertian = max(dot(lightDir,normal), 0.0);
  float specular = 0.0;

  if(lambertian > 0.0) {
    vec3 viewDir = normalize(-pos);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specAngle = max(dot(halfDir, normal), 0.0);
    specular = pow(specAngle, 16.0);
  }

  gl_FragColor = texture2D(spectral, vec2((height+300.0)/888.0, 0.5)) + vec4(specular * specColor, 1.0);
}