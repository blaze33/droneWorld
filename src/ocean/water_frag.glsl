#include <common>
#include <fog_pars_fragment>

#define whiteCompliment(a) ( 1.0 - saturate( a ) )

uniform sampler2D tReflectionMap;
uniform sampler2D tRefractionMap;
uniform sampler2D tNormalMap0;
uniform sampler2D tNormalMap1;
uniform sampler2D tDepth;

#ifdef USE_FLOWMAP
uniform sampler2D tFlowMap;
#else
uniform vec2 flowDirection;
#endif

uniform vec3 color;
uniform float reflectivity;
uniform float surface;
uniform vec4 config;
uniform mat4 clipToWorldMatrix;

varying vec4 vCoord;
varying vec2 vUv;
varying vec3 vToEye;

vec3 surfaceColor = vec3(0.0078, 0.5176, 0.7);
vec3 shoreColor = vec3(0.0078, 0.5176, 0.7);
vec3 depthColor = vec3(0.0039, 0.00196, 0.145);
// Description : Water color based on water depth and color extinction
//
// based on Rendering Water as a Post-process Effect by Wojciech Toman
//

// waterTransparency - x = , y = water visibility along eye vector,
// waterDepthValues - x = water depth in world space, y = view/accumulated water depth in world space
vec3 DepthRefraction(float waterDepth, float viewWaterDepth, vec3 refractionColor)
{
  float waterClarity = 0.75;
  float visibility = 200.;
  float shoreRange = 50.;
  float horizontalExtinction = 200.;

  float accDepth = viewWaterDepth * waterClarity; // accumulated water depth
  float accDepthExp = saturate(accDepth / (2.5 * visibility));
  accDepthExp *= (1.0 - accDepthExp) * accDepthExp * accDepthExp + 1.0; // out cubic

  surfaceColor = mix(shoreColor, surfaceColor, saturate(waterDepth / shoreRange));
  vec3 waterColor = mix(surfaceColor, depthColor, saturate(waterDepth / horizontalExtinction));

  refractionColor = mix(refractionColor, surfaceColor * waterColor, saturate(accDepth / visibility));
  refractionColor = mix(refractionColor, depthColor, accDepthExp);
  refractionColor = mix(refractionColor, depthColor * waterColor, saturate(waterDepth / horizontalExtinction));
  return refractionColor;
}

void main() {

  float flowMapOffset0 = config.x;
  float flowMapOffset1 = config.y;
  float halfCycle = config.z;
  float scale = config.w;

  vec3 toEye = normalize( vToEye );
  vec3 surfacePosition = cameraPosition - vToEye;

  // determine flow direction
  vec2 flow;
  #ifdef USE_FLOWMAP
  flow = texture2D( tFlowMap, vUv ).rg * 2.0 - 1.0;
  #else
  flow = flowDirection;
  #endif
  flow.x *= - 1.0;

  // sample normal maps (distort uvs with flowdata)
  vec4 normalColor0 = texture2D( tNormalMap0, ( vUv * scale ) + flow * flowMapOffset0 );
  vec4 normalColor1 = texture2D( tNormalMap1, ( vUv * scale ) + flow * flowMapOffset1 );

  // linear interpolate to get the final normal color
  float flowLerp = abs( halfCycle - flowMapOffset0 ) / halfCycle;
  vec4 normalColor = mix( normalColor0, normalColor1, flowLerp );

  // calculate normal vector
  //  vec3 normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
  vec3 normal = normalize( vec3( normalColor.r * 2.0 - 1.0,  normalColor.g * 2.0 - 1.0, normalColor.b ));

  // calculate the fresnel term to blend reflection and refraction maps
  float theta = max( dot( toEye, normal ), 0.0 );
  float reflectance = reflectivity + ( 1.0 - reflectivity ) * pow( ( 1.0 - theta ), 5.0 );

  // calculate final uv coords
  vec3 coord = vCoord.xyz / vCoord.w;
  vec2 uv = coord.xy + coord.z * normal.xy * 0.1;

  vec4 reflectColor = texture2D( tReflectionMap, vec2( 1.0 - uv.x, uv.y ) );
  vec4 refractColor = texture2D( tRefractionMap, uv );

  // water depth

  float zOverW = texture2D(tDepth, uv).x;
  // clipPosition is the viewport position at this pixel in the range -1 to 1.
  vec4 clipPosition = vec4(coord.xy * 2. - 1., zOverW * 2. - 1., 1.);
  vec4 worldPosition = clipToWorldMatrix * clipPosition;
  worldPosition /= worldPosition.w;

  float waterDepth = surfacePosition.z - worldPosition.z;
  float viewWaterDepth = length(surfacePosition - worldPosition.xyz);

  float depthDensity = 0.01;
  float depthFactor = whiteCompliment( exp2( - depthDensity * depthDensity * viewWaterDepth * viewWaterDepth * 1.442695 ) );
  refractColor.rgb = mix( refractColor.rgb, depthColor, 0.25 + depthFactor );
  // refractColor.rgb = DepthRefraction(waterDepth, viewWaterDepth, refractColor.rgb);

  // multiply water color with the mix of both textures
  gl_FragColor = vec4( color, 1.0 ) * mix( refractColor, reflectColor, reflectance );
  // gl_FragColor = refractColor;
  // gl_FragColor = vec4(vec3(waterDepth/500.), 1.0);

  // #include <tonemapping_fragment>
  // #include <encodings_fragment>
  // #include <fog_fragment>

}