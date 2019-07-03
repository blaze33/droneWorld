uniform vec3 color;
uniform float opacity;
@import three/src/renderers/shaders/ShaderChunk/common;
@import three/src/renderers/shaders/ShaderChunk/packing;
@import three/src/renderers/shaders/ShaderChunk/fog_pars_fragment;
@import three/src/renderers/shaders/ShaderChunk/bsdfs;
@import three/src/renderers/shaders/ShaderChunk/lights_pars;
@import three/src/renderers/shaders/ShaderChunk/shadowmap_pars_fragment;
@import three/src/renderers/shaders/ShaderChunk/shadowmask_pars_fragment;

@import ./glsl-diffuse-oren-nayar;

uniform sampler2D spectral;
uniform sampler2D heightmap;
uniform sampler2D rockTexture;
uniform sampler2D rockTextureNormal;
uniform sampler2D grassTexture;
uniform sampler2D grassTextureNormal;
uniform sampler2D icyTexture;
uniform sampler2D snowTexture;

varying vec3 vNormal;
varying vec3 pos;
varying float height;
varying vec2 UV;
varying vec3 vViewPosition;
varying float depth;
varying vec3 vSunPosition;




//http://www.thetenthplanet.de/archives/1180
mat3 cotangentFrame(vec3 N, vec3 p, vec2 uv) {
  // get edge vectors of the pixel triangle
  vec3 dp1 = dFdx(p);
  vec3 dp2 = dFdy(p);
  vec2 duv1 = dFdx(uv);
  vec2 duv2 = dFdy(uv);

  // solve the linear system
  vec3 dp2perp = cross(dp2, N);
  vec3 dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;

  // construct a scale-invariant frame
  float invmax = 1.0 / sqrt(max(dot(T,T), dot(B,B)));
  return mat3(T * invmax, B * invmax, N);
}

vec3 perturb(vec3 map, vec3 N, vec3 V, vec2 texcoord) {
  mat3 TBN = cotangentFrame(N, -V, texcoord);
  return normalize(TBN * map);
}

float phongSpecular(
  vec3 lightDirection,
  vec3 viewDirection,
  vec3 surfaceNormal,
  float shininess) {

  //Calculate Phong power
  vec3 R = -reflect(lightDirection, surfaceNormal);
  return pow(max(0.0, dot(viewDirection, R)), shininess);
}


void main() {

  vec3 normalRGB = texture2D(rockTextureNormal, UV * 20.0).rgb; //surface normal
  vec3 normalMap = normalRGB * 2.0 - 1.0;
  vec3 normalRGB2 = texture2D(grassTextureNormal, UV * 20.0).rgb; //surface normal
  vec3 normalMap2 = normalRGB2 * 2.0 - 1.0;

  vec3 L = normalize(vSunPosition);              //light direction
  vec3 V = normalize(vViewPosition);            //eye direction
  vec3 N = normalize(vNormal);
  vec3 normal = perturb(normalMap, N, V, UV * 20.0);
  vec3 normal2 = perturb(normalMap2, N, V, UV * 20.0);

  vec3 diffuse = vec3(1.0) * orenNayarDiffuse(L, V, normal, 1.0, 0.95);
  float specular = 0.2 * phongSpecular(L, V, normal, 12.0);

  vec3 diffuse2 = vec3(1.0) * orenNayarDiffuse(L, V, normal2, 1.0, 0.95);
  float specular2 = 0.1 * phongSpecular(L, V, normal2, 12.0);

  vec4 color = texture2D(spectral, vec2(abs(height/8000.0), 0.5)); // + vec4(specular * specColor, 1.0);
  float flatness = dot(normal, vec3(0.0, 0.0, 1.0));
  vec4 colorTerrain = mix(
    texture2D(rockTexture, UV * 20.0) * (vec4(diffuse, 1.0) + vec4(0.7)) + specular,
    texture2D(grassTexture, UV * 20.0) * (vec4(diffuse2, 1.0) + vec4(0.7)) + specular2,
    smoothstep(0.55, 0.75, flatness)
    // flatness
  );
  vec4 colorSnow = mix(
    texture2D(icyTexture, UV * 20.0),
    texture2D(snowTexture, UV * 20.0),
    smoothstep(0.5, 0.6, flatness)
    // flatness
  );

  vec4 colorTerrain2 = colorTerrain;
  vec4 colorOcean = normalize(vec4(91.0 / 256.0, 154.0 / 256.0, 205.0 / 256.0, 1.0));
  vec4 colorOcean2 = colorOcean * (vec4(diffuse, 1.0) + vec4(0.7));
  vec4 colorH = texture2D(heightmap, UV);

  float zero = smoothstep(-1.0, -.5, height) - smoothstep(.5, 1.0, height);
  float zeroOcean = 1.0 - smoothstep(0.0, 1.0, height);
  vec4 colorTotal = mix(colorTerrain2, colorOcean2, zeroOcean);

  // gl_FragColor = colorTotal / sqrt(2.0)* (colorTotal + vec4(diffuse, 1.0));
  colorTotal = colorTotal * (getShadowMask());
  gl_FragColor = vec4(colorTotal.rgb, 1.0);
  // gl_FragColor = vec4(normal, 1.0);
  // gl_FragColor = vec4(diffuse, 1.0);

  // with black fog
  // gl_FragColor = mix(gl_FragColor, vec4(0.0, 0.0, 0.0, 1.0),  depth);

}