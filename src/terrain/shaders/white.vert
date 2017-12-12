varying float height;
varying vec3 pos;
varying vec3 vNormal;
attribute float angle;
varying float ang;

void main() {
  height = position.z * 20.0;
  vec4 mpos = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mpos;
  pos = -mpos.xyz;
  vNormal = normal;
  ang = angle;
}