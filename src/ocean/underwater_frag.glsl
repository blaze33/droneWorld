#include <common>
#include <packing>
#include <fog_pars_fragment>

#define whiteCompliment(a) ( 1.0 - saturate( a ) )

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler2D tReflectionMap;
uniform sampler2D tReflectionDepth;
uniform sampler2D tNormalMap0;
uniform sampler2D tNormalMap1;

#ifdef USE_FLOWMAP
uniform sampler2D tFlowMap;
#else
uniform vec2 flowDirection;
#endif

uniform vec3 color;
uniform float reflectivity;
uniform float time;
uniform float waterLevel;
uniform vec4 config;
uniform vec3 sunPosition;
uniform mat4 clipToWorldMatrix;
uniform mat4 worldToClipMatrix;

varying vec4 vCoord;
varying vec2 vUv;
varying vec3 vToEye;

// vec3 depthColor = vec3(0.0039, 0.00196, 0.145);
vec3 depthColor = vec3(0.0117, 0.0117, 0.325);

#define LOG2 1.442695
#define TAU 6.28318530718
#define MAX_ITER 5
vec3 caustic(vec2 uv) {
  vec2 p = mod(uv*TAU, TAU)-250.0;

  vec2 i = vec2(p);
  float c = 1.0;
  float inten = .005;

  for (int n = 0; n < MAX_ITER; n++) {
    float t = time * (1.0 - (3.5 / float(n+1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten),p.y / (cos(i.y+t)/inten)));
  }

  c /= float(MAX_ITER);
  c = 1.17-pow(c, 1.4);
  vec3 color = vec3(pow(abs(c), 8.0));
  // color = clamp(color + vec3(0.0, 0.35, 0.5), 0.0, 1.0);
  color = mix(color, vec3(1.0,1.0,1.0),0.5);

  return color;
}

float causticX(float x, float power, float gtime) {
  float p = mod(x*TAU, TAU)-250.0;

  float i = p;;
  float c = 1.0;
  float inten = .005;

  for (int n = 0; n < MAX_ITER/2; n++) {
    float t = gtime * (1.0 - (3.5 / float(n+1)));
    i = p + cos(t - i) + sin(t + i);
    c += 1.0/length(p / (sin(i+t)/inten));
  }
  c /= float(MAX_ITER);
  c = 1.17-pow(c, power);

  return c;
}

float GodRays(vec2 uv) {
  float light = 0.0;
  vec4 uvSun = worldToClipMatrix * vec4(sunPosition, 1.);
  uvSun /= uvSun.w;
  uvSun = uvSun / 2. + 0.5;
  vec2 uv2 = vec2(
    dot(normalize(uv - uvSun.xy), vec2(1., 0.)),
    length(uv - uvSun.xy)
  );

  light += pow(causticX((uv2.x + 0.08 * uv2.y) / 1.7 + 0.5, 1.8, time * 0.65), 10.0) * 0.05;
  light += pow(causticX(sin(uv2.x), 0.3, time * 0.7), 9.0) * 0.4;
  light += pow(causticX(cos(uv2.x * 2.3), 0.3, time * 1.3), 4.0) * 0.1;

  light *= smoothstep(0., .3, uv2.y) * smoothstep(0., .3, uv2.y);
  light = clamp(light, 0.0, 1.0);

  return light;
}

#define HASHSCALE1 .1031
#define HASHSCALE3 vec3(.1031, .1030, .0973)
float hash11(float p)
{
  vec3 p3  = fract(vec3(p) * HASHSCALE1);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}
vec3 hash33(vec3 p3)
{
  p3 = fract(p3 * HASHSCALE3);
    p3 += dot(p3, p3.yxz+19.19);
    return fract((p3.xxy + p3.yxx)*p3.zyx);
}

const int   STAR_VOXEL_STEPS = 8;
const float STAR_VOXEL_STEP_SIZE = 3.;

float distanceRayPoint(vec3 ro, vec3 rd, vec3 p, out float h) {
    h = dot(p - ro, rd);
    return length(p - ro - rd * h);
}
vec3 getDotColour(float t)
{
  return vec3(t*.57,t*.3,t*.05);
  return vec3(t*.9,t*.9,t*.9);
  return vec3(t*.3,t*.6,t*.5);
}

// This code is the starfield stuff from iapafoto
// https://www.shadertoy.com/view/Xl2BRR
vec4 detritus(in vec3 ro, in vec3 rd, in float tmax) {

  float d =  0.;

  vec3 ros = ro + rd*d;
  ros /= STAR_VOXEL_STEP_SIZE;
  vec3 pos = floor(ros),
       mm, ri = 1./rd,
       rs = sign(rd),
       dis = (pos - ros + 0.5 + rs * 0.5) * ri;

  float dint;
  vec3 offset, id;
  vec4 col = vec4(0);
  vec4 sum = vec4(0);

  for(int i = 0; i < STAR_VOXEL_STEPS; i++) {
    id = hash33(pos);
    float size  = hash11(float(i))*.02 + .005;
    offset = clamp(id + .2 * cos(id + id.x * time), size, 1. - size);
    d = distanceRayPoint(ros, rd, pos + offset, dint);

    if (dint > 0. && dint * STAR_VOXEL_STEP_SIZE < tmax) {
      col = vec4(getDotColour(id.x), .8) * smoothstep(size, 0.0, d);
      col.a *= smoothstep(float(STAR_VOXEL_STEPS), 0., dint);
      col.rgb *= col.a / dint;
      sum += (1. - sum.a) * col;
      if (sum.a>.99) break;
    }

    mm = step(dis.xyz, dis.yxy) * step(dis.xyz, dis.zzx);
    dis += mm * rs * ri;
    pos += mm * rs;
  }

  return sum * .75;
}


void main() {

  float flowMapOffset0 = config.x;
  float flowMapOffset1 = config.y;
  float halfCycle = config.z;
  float scale = config.w;

  float depth = texture2D(tDepth, vUv).x;
  float w;
  // float logDepthBufFC = 2.0 / log2( 1000000. + 1.0 );
  // float w = pow(2.0, (2. * depth / logDepthBufFC)) - 1.0;
  // depth = viewZToPerspectiveDepth(-w, 1., 1000000.);

  vec4 world = clipToWorldMatrix * vec4(vUv * 2. - 1., depth * 2. - 1., 1.0);
  world /= world.w;
  float worldDistance = length(world.xyz - cameraPosition);

  vec3 dir = normalize(world.xyz - cameraPosition);
  vec3 hitPoint = linePlaneIntersect(cameraPosition, dir, vec3(0., 0., waterLevel), vec3(0., 0., -1.));
  float hitDirection = dot(hitPoint - cameraPosition, dir);
  float hitDistance = hitDirection > 0. ? length(hitPoint - cameraPosition) : 1e7;

  float dist = min(hitDistance, worldDistance);
  float fogDensity = 0.007;
  float fogFactor;
  vec3 nearestPoint = dist == hitDistance ? hitPoint : world.xyz;
  float waterDepth = waterLevel - nearestPoint.z;

  // sample normal maps (distort uvs with flowdata)
  vec2 nUV = fract(hitPoint.xy / 15.);
  vec2 flow = vec2(1., 1.);
  vec4 normalColor0 = texture2D( tNormalMap0, nUV + flow * time / 10.);
  vec4 normalColor1 = texture2D( tNormalMap1, nUV + flow * time / 10.);

  // linear interpolate to get the final normal color
  float flowLerp = sin(time) / 2. + 0.5;
  vec4 normalColor = mix( normalColor0, normalColor1, flowLerp );

  // calculate normal vector
  vec3 normal = normalize( vec3( normalColor.r * 2.0 - 1.0,  normalColor.g * 2.0 - 1.0, -normalColor.b ));
  vec3 waterNormal = normalize(normal);
  vec4 coord = worldToClipMatrix * vec4(hitPoint.xy + waterNormal.xy * waterNormal.z * 3., hitPoint.z, 1.0);
  coord /= coord.w;
  coord = coord / 2.0 + 0.5;
  // coord.xy = vUv;

  if (worldDistance < hitDistance) {
    gl_FragColor = texture2D(tDiffuse, vUv);
    gl_FragColor.rgb *= caustic(nearestPoint.xy / 10.);
  } else {

    // calculate the fresnel term to blend reflection and refraction maps
    float theta = max( dot( -dir, waterNormal ), 0.0 );
    float reflectance = reflectivity + ( 1.0 - reflectivity ) * pow( ( 1.0 - theta ), 5.0 );
    reflectance = (1. - length(refract(dir, waterNormal, 1.33))) * reflectance;
    reflectance = clamp(reflectance, 0.15, 0.85);

    vec4 reflectColor = texture2D( tReflectionMap, vec2(1. - coord.x, coord.y) );
    vec4 reflectDepth = texture2D( tReflectionDepth, vec2(1.0 - coord.x, coord.y) );
    vec4 refractColor = texture2D( tDiffuse, coord.xy );

    // w = pow(2.0, (2. * reflectDepth.x / logDepthBufFC)) - 1.0;
    // w = -perspectiveDepthToViewZ(reflectDepth.x, 1., 1000000.);
    // reflectDepth.x = viewZToPerspectiveDepth(-w, 1., 1000000.);
    w = 500. * reflectDepth.x + dist;

    fogFactor = whiteCompliment( exp2( - fogDensity * fogDensity * w * w * LOG2 ) );
    reflectColor.rgb = mix(reflectColor.rgb, depthColor, fogFactor);

    // multiply water color with the mix of both textures
    gl_FragColor = vec4( color, 1.0 ) * mix( refractColor, reflectColor, reflectance );
    // gl_FragColor = vec4(vec3(reflectance), 1.0);
    // gl_FragColor = reflectColor;
    // gl_FragColor = reflectDepth;
    // gl_FragColor = vec4(vec3(w/500.), 1.0);
    // gl_FragColor = vec4(vec3(w/100.), 1.0);

}

// float fogDepth = dist + waterDepth * min(1., waterDepth / 100.);
float fogDepth = dist + clamp(waterLevel - cameraPosition.z, 0., 100.);
fogFactor = whiteCompliment( exp2( - fogDensity * fogDensity * fogDepth * fogDepth * LOG2 ) );
gl_FragColor.rgb = mix(gl_FragColor.rgb, depthColor, fogFactor);

gl_FragColor.rgb += GodRays(vUv) * (1. - smoothstep(0., 100., waterLevel - cameraPosition.z));

vec4 star = detritus(cameraPosition, dir,  min(40., dist / STAR_VOXEL_STEP_SIZE));
gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - star.a)+star.rgb;


// gl_FragColor = texture2D(tReflectionMap, vec2(1.0 - vUv.x, vUv.y));
// gl_FragColor = vec4(dir, 1.);
// gl_FragColor = vec4( vec3(dist /1000.), 1.0 );
// gl_FragColor = vec4( vec3(hitDistance/100.), 1.0 );
// gl_FragColor = vec4( vec3(dist/100.), 1.0 );

}