precision mediump float;
// #pragma glslify: faceNormals = require('glsl-face-normal')
uniform float bFlat;
uniform sampler2D spectral;
uniform sampler2D heightmap;
uniform sampler2D rockTexture;
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

  vec3 lightDirection = vec3(3.0, 3.0, 1.0);
  vec3 L = normalize(lightDirection);              //light direction
  vec3 V = normalize(vViewPosition);            //eye direction
  vec3 N = vNormal; //surface normal
  vec3 diffuse = vec3(1.0) * orenNayarDiffuse(L, V, N, 1.0, 0.95);  
  float c = 0.35 + max(0.0, dot(vNormal, lightDirection)) * 0.4;

  vec4 color = texture2D(spectral, vec2(abs(height/8000.0), 0.5)); // + vec4(specular * specColor, 1.0);
  vec4 colorOcean = normalize(vec4(91.0, 154.0, 205.0, 1.0)) ;//* (11000.0 + height)/11000.0;
  float flatness = dot(vNormal, vec3(0.0, 0.0, 1.0));
  vec4 colorTerrain = mix(
    texture2D(rockTexture, UV * 20.0),
    texture2D(grassTexture, UV * 20.0),
    flatness
  );
  float sobelValue = clamp(sobel.r, 0.0, 0.3);
  vec4 color2 = mix(color, vec4(1., 1., 1., 1.0), sobelValue);
  vec4 colorTerrain2 = mix(
    colorTerrain, vec4(1.0),
    smoothstep(0.4, 0.5, sobelValue)
  );
  vec4 colorOcean2 = mix(colorOcean, vec4(0), sobelValue);
  vec4 colorH = texture2D(heightmap, UV);
  vec4 colorNormal = vec4(vNormal, 0);
  float zero = smoothstep(-1.0, -.5, height) - smoothstep(.5, 1.0, height);
  float zeroOcean = 1.0 - smoothstep(0.0, 1.0, height);
  vec4 colorTotal = mix(colorTerrain2, colorOcean2, zeroOcean);
  // // gl_FragColor = mix(color2, vec4(0), zero);
  // // gl_FragColor = mix(colorTotal, vec4(0), zero); //* vec4(diffuse, 1.0);

  gl_FragColor = mix(colorTotal / sqrt(2.0)* (colorTotal + vec4(diffuse, 1.0)), vec4(1.0),  depth);
  
  // gl_FragColor = texture2D(rockTexture, UV);
  

  // gl_FragColor = colorTotal * (colorTotal);
  // gl_FragColor = texture2D(spectral, vec2((height+300.0)/888.0, 0.5)) + vec4(specular * specColor, 1.0);
}