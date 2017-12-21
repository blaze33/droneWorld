precision mediump float;
// #pragma glslify: faceNormals = require('glsl-face-normal')
uniform float bFlat;
uniform sampler2D spectral;
uniform sampler2D heightmap;
uniform sampler2D rockTexture;
uniform sampler2D rockTextureNormal;
uniform sampler2D grassTexture;
uniform sampler2D icyTexture;
uniform sampler2D snowTexture;
varying vec3 vNormal;
varying vec3 pos;
varying float height;
varying float ang;
varying vec2 UV;
varying vec3 vViewPosition;
varying float depth;
varying vec3 vSunPosition;
const vec3 lightPos   = vec3(100,100,50);
const vec3 specColor  = vec3(1.0, 1.0, 1.0);

@import ./glsl-diffuse-oren-nayar;

vec3 normals(vec3 pos) {
  vec3 fdx = dFdx(pos);
  vec3 fdy = dFdy(pos);
  return normalize(cross(fdx, fdy));
}

void make_kernel(inout vec4 n[9], sampler2D tex, vec2 coord)
{
  float w = 1.0 / 256.0;
  float h = 1.0 / 256.0;

  n[0] = texture2D(tex, coord + vec2( -w, -h));
  n[1] = texture2D(tex, coord + vec2(0.0, -h));
  n[2] = texture2D(tex, coord + vec2(  w, -h));
  n[3] = texture2D(tex, coord + vec2( -w, 0.0));
  n[4] = texture2D(tex, coord);
  n[5] = texture2D(tex, coord + vec2(  w, 0.0));
  n[6] = texture2D(tex, coord + vec2( -w, h));
  n[7] = texture2D(tex, coord + vec2(0.0, h));
  n[8] = texture2D(tex, coord + vec2(  w, h));
}


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
  // vec3 normal = mix(vNormal, normals(pos), bFlat);
  // // vec3 vNormal = faceNormals(pos);
  // // gl_FragColor = vec4(vNormal, 1.0);

  // // vec3 lightDir = normalize(lightPos - pos);
  // // float lambertian = max(dot(lightDir,normal), 0.0);
  // // float specular = 0.0;

  // // if(lambertian > 0.0) {
  // //   vec3 viewDir = normalize(-pos);
  // //   vec3 halfDir = normalize(lightDir + viewDir);
  // //   float specAngle = max(dot(halfDir, normal), 0.0);
  // //   specular = pow(specAngle, 16.0);
  // // }

  vec4 n[9];
  make_kernel( n, heightmap, UV );
  vec4 sobel_edge_h = n[2] + (2.0*n[5]) + n[8] - (n[0] + (2.0*n[3]) + n[6]);
  vec4 sobel_edge_v = n[0] + (2.0*n[1]) + n[2] - (n[6] + (2.0*n[7]) + n[8]);
  vec4 sobel = sqrt((sobel_edge_h * sobel_edge_h) + (sobel_edge_v * sobel_edge_v));


  vec3 normalRGB = texture2D(rockTextureNormal, UV * 20.0).rgb; //surface normal
  vec3 normalMap = normalRGB * 2.0 - 1.0;

  vec3 lightDirection = vec3(-3.0, 3.0, 1.0);
  vec3 L = normalize(vSunPosition);              //light direction
  vec3 V = normalize(vViewPosition);            //eye direction
  vec3 N = normalize(vNormal);
  vec3 normal = perturb(normalMap, N, V, UV * 20.0);

  vec3 diffuse = vec3(1.0) * orenNayarDiffuse(L, V, normal, 1.0, 0.95);

  float specular = 0.3 * phongSpecular(L, V, normal, 12.0);


  vec4 color = texture2D(spectral, vec2(abs(height/8000.0), 0.5)); // + vec4(specular * specColor, 1.0);
  vec4 colorOcean = normalize(vec4(91.0, 154.0, 205.0, 1.0)) ;//* (11000.0 + height)/11000.0;
  float flatness = dot(normal, vec3(0.0, 0.0, 1.0));
  vec4 colorTerrain = mix(
    texture2D(rockTexture, UV * 20.0) * (vec4(diffuse, 1.0) + vec4(0.7)) + specular,
    texture2D(grassTexture, UV * 20.0),
    smoothstep(0.55, 0.75, flatness)
    // flatness
  );
  vec4 colorSnow = mix(
    texture2D(icyTexture, UV * 20.0),
    texture2D(snowTexture, UV * 20.0),
    smoothstep(0.5, 0.6, flatness)
    // flatness
  );
  // vec colorTerrain4 = mix

  float sobelValue = clamp(sobel.r, 0.0, 0.3);
  vec4 color2 = mix(color, vec4(1., 1., 1., 1.0), sobelValue);
  vec4 colorTerrain2 = mix(
    colorTerrain, vec4(1.0),
    sobelValue
    // smoothstep(0.4, 0.5, sobelValue)
  );
  vec4 colorOcean2 = mix(colorOcean, vec4(0), sobelValue);
  vec4 colorH = texture2D(heightmap, UV);
  vec4 colorNormal = vec4(vNormal, 0);
  float zero = smoothstep(-1.0, -.5, height) - smoothstep(.5, 1.0, height);
  float zeroOcean = 1.0 - smoothstep(0.0, 1.0, height);
  vec4 colorTotal = mix(colorTerrain2, colorOcean2, zeroOcean);
  // // gl_FragColor = mix(color2, vec4(0), zero);
  // // gl_FragColor = mix(colorTotal, vec4(0), zero); //* vec4(diffuse, 1.0);

  gl_FragColor = colorTotal / sqrt(2.0)* (colorTotal + vec4(diffuse, 1.0));
  // gl_FragColor = vec4(normal, 1.0);
  // gl_FragColor = vec4(diffuse, 1.0);

  // with black fog
  // gl_FragColor = mix(gl_FragColor, vec4(0.0, 0.0, 0.0, 1.0),  depth);
  
  // gl_FragColor = texture2D(rockTexture, UV);
  

  // gl_FragColor = colorTotal * (colorTotal);
  // gl_FragColor = texture2D(spectral, vec2((height+300.0)/888.0, 0.5)) + vec4(specular * specColor, 1.0);
}