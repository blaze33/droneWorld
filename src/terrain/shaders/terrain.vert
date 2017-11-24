
uniform sampler2D heightmap;

varying float height;
varying vec2 vUV;
varying vec3 vNormal;
varying vec3 pos;

float getHeight(vec2 uv) {
  vec4 heightData = texture2D( heightmap, uv );
  return (heightData.r * 255.0 * 256.0 + heightData.g * 255.0 + heightData.b * 255.0 / 256.) - 32768.0 - 300.0;
}

void main() 
{ 
  vUV = uv;

  height = getHeight(uv);

  // move the position along the normal
  vec3 newPosition = position + normal * height / 50.0;
  
  vec4 mpos = modelViewMatrix * vec4( newPosition, 1.0 );
  gl_Position = projectionMatrix * mpos;

  vec3 off = vec3(0.005, 0.005, 0.0);
  float hL = getHeight(uv - off.xz);
  float hR = getHeight(uv + off.xz);
  float hD = getHeight(uv - off.zy);
  float hU = getHeight(uv + off.zy);
  vNormal.x = hL - hR;
  vNormal.y = hD - hU;
  vNormal.z = 2.0;

  // Rotate the object normals by a 3x3 normal matrix.
  vNormal = normalize(normalMatrix * vNormal);
  pos = -mpos.xyz;
}