uniform vec3 color;
uniform float opacity;
#define PI 3.14159265359
#define PI2 6.28318530718
#define PI_HALF 1.5707963267949
#define RECIPROCAL_PI 0.31830988618
#define RECIPROCAL_PI2 0.15915494
#define LOG2 1.442695
#define EPSILON 1e-6

#define saturate(a) clamp( a, 0.0, 1.0 )
#define whiteCompliment(a) ( 1.0 - saturate( a ) )

float pow2( const in float x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }
// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand( const in vec2 uv ) {
  const highp float a = 12.9898, b = 78.233, c = 43758.5453;
  highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
  return fract(sin(sn) * c);
}

struct IncidentLight {
  vec3 color;
  vec3 direction;
  bool visible;
};

struct ReflectedLight {
  vec3 directDiffuse;
  vec3 directSpecular;
  vec3 indirectDiffuse;
  vec3 indirectSpecular;
};

struct GeometricContext {
  vec3 position;
  vec3 normal;
  vec3 viewDir;
};

vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

  return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

}

// http://en.wikibooks.org/wiki/GLSL_Programming/Applying_Matrix_Transformations
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {

  return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );

}

vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

  float distance = dot( planeNormal, point - pointOnPlane );

  return - distance * planeNormal + point;

}

float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {

  return sign( dot( point - pointOnPlane, planeNormal ) );

}

vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {

  return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;

}

mat3 transposeMat3( const in mat3 m ) {

  mat3 tmp;

  tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
  tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
  tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );

  return tmp;

}

// https://en.wikipedia.org/wiki/Relative_luminance
float linearToRelativeLuminance( const in vec3 color ) {

  vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );

  return dot( weights, color.rgb );

}

vec3 packNormalToRGB( const in vec3 normal ) {
  return normalize( normal ) * 0.5 + 0.5;
}

vec3 unpackRGBToNormal( const in vec3 rgb ) {
  return 2.0 * rgb.xyz - 1.0;
}

const float PackUpscale = 256. / 255.; // fraction -> 0..1 (including 1)
const float UnpackDownscale = 255. / 256.; // 0..1 -> fraction (excluding 1)

const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256.,  256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );

const float ShiftRight8 = 1. / 256.;

vec4 packDepthToRGBA( const in float v ) {
  vec4 r = vec4( fract( v * PackFactors ), v );
  r.yzw -= r.xyz * ShiftRight8; // tidy overflow
  return r * PackUpscale;
}

float unpackRGBAToDepth( const in vec4 v ) {
  return dot( v, UnpackFactors );
}

// NOTE: viewZ/eyeZ is < 0 when in front of the camera per OpenGL conventions

float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
  return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
  return linearClipZ * ( near - far ) - near;
}

float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
  return (( near + viewZ ) * far ) / (( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
  return ( near * far ) / ( ( far - near ) * invClipZ - far );
}

float punctualLightIntensityToIrradianceFactor( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {

  if( decayExponent > 0.0 ) {

#if defined ( PHYSICALLY_CORRECT_LIGHTS )

    // based upon Frostbite 3 Moving to Physically-based Rendering
    // page 32, equation 26: E[window1]
    // https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
    // this is intended to be used on spot and point lights who are represented as luminous intensity
    // but who must be converted to luminous irradiance for surface lighting calculation
    float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
    float maxDistanceCutoffFactor = pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
    return distanceFalloff * maxDistanceCutoffFactor;

#else

    return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );

#endif

  }

  return 1.0;

}

vec3 BRDF_Diffuse_Lambert( const in vec3 diffuseColor ) {

  return RECIPROCAL_PI * diffuseColor;

} // validated

vec3 F_Schlick( const in vec3 specularColor, const in float dotLH ) {

  // Original approximation by Christophe Schlick '94
  // float fresnel = pow( 1.0 - dotLH, 5.0 );

  // Optimized variant (presented by Epic at SIGGRAPH '13)
  // https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
  float fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );

  return ( 1.0 - specularColor ) * fresnel + specularColor;

} // validated

// Microfacet Models for Refraction through Rough Surfaces - equation (34)
// http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
// alpha is "roughness squared" in Disney’s reparameterization
float G_GGX_Smith( const in float alpha, const in float dotNL, const in float dotNV ) {

  // geometry term (normalized) = G(l)⋅G(v) / 4(n⋅l)(n⋅v)
  // also see #12151

  float a2 = pow2( alpha );

  float gl = dotNL + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
  float gv = dotNV + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );

  return 1.0 / ( gl * gv );

} // validated

// Moving Frostbite to Physically Based Rendering 3.0 - page 12, listing 2
// https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
float G_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {

  float a2 = pow2( alpha );

  // dotNL and dotNV are explicitly swapped. This is not a mistake.
  float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
  float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );

  return 0.5 / max( gv + gl, EPSILON );

}

// Microfacet Models for Refraction through Rough Surfaces - equation (33)
// http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
// alpha is "roughness squared" in Disney’s reparameterization
float D_GGX( const in float alpha, const in float dotNH ) {

  float a2 = pow2( alpha );

  float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0; // avoid alpha = 0 with dotNH = 1

  return RECIPROCAL_PI * a2 / pow2( denom );

}

// GGX Distribution, Schlick Fresnel, GGX-Smith Visibility
vec3 BRDF_Specular_GGX( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float roughness ) {

  float alpha = pow2( roughness ); // UE4's roughness

  vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );

  float dotNL = saturate( dot( geometry.normal, incidentLight.direction ) );
  float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
  float dotNH = saturate( dot( geometry.normal, halfDir ) );
  float dotLH = saturate( dot( incidentLight.direction, halfDir ) );

  vec3 F = F_Schlick( specularColor, dotLH );

  float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );

  float D = D_GGX( alpha, dotNH );

  return F * ( G * D );

} // validated

// Rect Area Light

// Area light computation code adapted from:
// Real-Time Polygonal-Light Shading with Linearly Transformed Cosines
// By: Eric Heitz, Jonathan Dupuy, Stephen Hill and David Neubelt
// https://drive.google.com/file/d/0BzvWIdpUpRx_d09ndGVjNVJzZjA/view
// https://eheitzresearch.wordpress.com/415-2/
// http://blog.selfshadow.com/sandbox/ltc.html

vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {

  const float LUT_SIZE  = 64.0;
  const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
  const float LUT_BIAS  = 0.5 / LUT_SIZE;

  float theta = acos( dot( N, V ) );

  // Parameterization of texture:
  // sqrt(roughness) -> [0,1]
  // theta -> [0, PI/2]
  vec2 uv = vec2(
    sqrt( saturate( roughness ) ),
    saturate( theta / ( 0.5 * PI ) ) );

  // Ensure we don't have nonlinearities at the look-up table's edges
  // see: http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter24.html
  //      "Shader Analysis" section
  uv = uv * LUT_SCALE + LUT_BIAS;

  return uv;

}

// Real-Time Area Lighting: a Journey from Research to Production
// By: Stephen Hill & Eric Heitz
// http://advances.realtimerendering.com/s2016/s2016_ltc_rnd.pdf
// An approximation for the form factor of a clipped rectangle.
float LTC_ClippedSphereFormFactor( const in vec3 f ) {

  float l = length( f );

  return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );

}

// Real-Time Polygonal-Light Shading with Linearly Transformed Cosines
// also Real-Time Area Lighting: a Journey from Research to Production
// http://advances.realtimerendering.com/s2016/s2016_ltc_rnd.pdf
// Normalization by 2*PI is incorporated in this function itself.
// theta/sin(theta) is approximated by rational polynomial
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {

  float x = dot( v1, v2 );

  float y = abs( x );
  float a = 0.86267 + (0.49788 + 0.01436 * y ) * y;
  float b = 3.45068 + (4.18814 + y) * y;
  float v = a / b;

  float theta_sintheta = (x > 0.0) ? v : 0.5 * inversesqrt( 1.0 - x * x ) - v;

  return cross( v1, v2 ) * theta_sintheta;

}

vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {

  // bail if point is on back side of plane of light
  // assumes ccw winding order of light vertices
  vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
  vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
  vec3 lightNormal = cross( v1, v2 );

  if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );

  // construct orthonormal basis around N
  vec3 T1, T2;
  T1 = normalize( V - N * dot( V, N ) );
  T2 = - cross( N, T1 ); // negated from paper; possibly due to a different assumed handedness of world coordinate system

  // compute transform
  mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );

  // transform rect
  vec3 coords[ 4 ];
  coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
  coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
  coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
  coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );

  // project rect onto sphere
  coords[ 0 ] = normalize( coords[ 0 ] );
  coords[ 1 ] = normalize( coords[ 1 ] );
  coords[ 2 ] = normalize( coords[ 2 ] );
  coords[ 3 ] = normalize( coords[ 3 ] );

  // calculate vector form factor
  vec3 vectorFormFactor = vec3( 0.0 );
  vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
  vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
  vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
  vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );

  // adjust for horizon clipping
  vec3 result = vec3( LTC_ClippedSphereFormFactor( vectorFormFactor ) );

  return result;

}

// End Rect Area Light

// ref: https://www.unrealengine.com/blog/physically-based-shading-on-mobile - environmentBRDF for GGX on mobile
vec3 BRDF_Specular_GGX_Environment( const in GeometricContext geometry, const in vec3 specularColor, const in float roughness ) {

  float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );

  const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );

  const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );

  vec4 r = roughness * c0 + c1;

  float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;

  vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;

  return specularColor * AB.x + AB.y;

} // validated


float G_BlinnPhong_Implicit( /* const in float dotNL, const in float dotNV */ ) {

  // geometry term is (n dot l)(n dot v) / 4(n dot l)(n dot v)
  return 0.25;

}

float D_BlinnPhong( const in float shininess, const in float dotNH ) {

  return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );

}

vec3 BRDF_Specular_BlinnPhong( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess ) {

  vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );

  //float dotNL = saturate( dot( geometry.normal, incidentLight.direction ) );
  //float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
  float dotNH = saturate( dot( geometry.normal, halfDir ) );
  float dotLH = saturate( dot( incidentLight.direction, halfDir ) );

  vec3 F = F_Schlick( specularColor, dotLH );

  float G = G_BlinnPhong_Implicit( /* dotNL, dotNV */ );

  float D = D_BlinnPhong( shininess, dotNH );

  return F * ( G * D );

} // validated

// source: http://simonstechblog.blogspot.ca/2011/12/microfacet-brdf.html
float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {
  return ( 2.0 / pow2( ggxRoughness + 0.0001 ) - 2.0 );
}

float BlinnExponentToGGXRoughness( const in float blinnExponent ) {
  return sqrt( 2.0 / ( blinnExponent + 2.0 ) );
}

uniform vec3 ambientLightColor;

vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {

  vec3 irradiance = ambientLightColor;

  #ifndef PHYSICALLY_CORRECT_LIGHTS

    irradiance *= PI;

  #endif

  return irradiance;

}

#if NUM_DIR_LIGHTS > 0

  struct DirectionalLight {
    vec3 direction;
    vec3 color;

    int shadow;
    float shadowBias;
    float shadowRadius;
    vec2 shadowMapSize;
  };

  uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];

  void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {

    directLight.color = directionalLight.color;
    directLight.direction = directionalLight.direction;
    directLight.visible = true;

  }

#endif


#if NUM_POINT_LIGHTS > 0

  struct PointLight {
    vec3 position;
    vec3 color;
    float distance;
    float decay;

    int shadow;
    float shadowBias;
    float shadowRadius;
    vec2 shadowMapSize;
    float shadowCameraNear;
    float shadowCameraFar;
  };

  uniform PointLight pointLights[ NUM_POINT_LIGHTS ];

  // directLight is an out parameter as having it as a return value caused compiler errors on some devices
  void getPointDirectLightIrradiance( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight directLight ) {

    vec3 lVector = pointLight.position - geometry.position;
    directLight.direction = normalize( lVector );

    float lightDistance = length( lVector );

    directLight.color = pointLight.color;
    directLight.color *= punctualLightIntensityToIrradianceFactor( lightDistance, pointLight.distance, pointLight.decay );
    directLight.visible = ( directLight.color != vec3( 0.0 ) );

  }

#endif


#if NUM_SPOT_LIGHTS > 0

  struct SpotLight {
    vec3 position;
    vec3 direction;
    vec3 color;
    float distance;
    float decay;
    float coneCos;
    float penumbraCos;

    int shadow;
    float shadowBias;
    float shadowRadius;
    vec2 shadowMapSize;
  };

  uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];

  // directLight is an out parameter as having it as a return value caused compiler errors on some devices
  void getSpotDirectLightIrradiance( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight directLight  ) {

    vec3 lVector = spotLight.position - geometry.position;
    directLight.direction = normalize( lVector );

    float lightDistance = length( lVector );
    float angleCos = dot( directLight.direction, spotLight.direction );

    if ( angleCos > spotLight.coneCos ) {

      float spotEffect = smoothstep( spotLight.coneCos, spotLight.penumbraCos, angleCos );

      directLight.color = spotLight.color;
      directLight.color *= spotEffect * punctualLightIntensityToIrradianceFactor( lightDistance, spotLight.distance, spotLight.decay );
      directLight.visible = true;

    } else {

      directLight.color = vec3( 0.0 );
      directLight.visible = false;

    }
  }

#endif


#if NUM_RECT_AREA_LIGHTS > 0

  struct RectAreaLight {
    vec3 color;
    vec3 position;
    vec3 halfWidth;
    vec3 halfHeight;
  };

  // Pre-computed values of LinearTransformedCosine approximation of BRDF
  // BRDF approximation Texture is 64x64
  uniform sampler2D ltcMat; // RGBA Float
  uniform sampler2D ltcMag; // Alpha Float (only has w component)

  uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];

#endif


#if NUM_HEMI_LIGHTS > 0

  struct HemisphereLight {
    vec3 direction;
    vec3 skyColor;
    vec3 groundColor;
  };

  uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];

  vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in GeometricContext geometry ) {

    float dotNL = dot( geometry.normal, hemiLight.direction );
    float hemiDiffuseWeight = 0.5 * dotNL + 0.5;

    vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );

    #ifndef PHYSICALLY_CORRECT_LIGHTS

      irradiance *= PI;

    #endif

    return irradiance;

  }

#endif


#if defined( USE_ENVMAP ) && defined( PHYSICAL )

  vec3 getLightProbeIndirectIrradiance( /*const in SpecularLightProbe specularLightProbe,*/ const in GeometricContext geometry, const in int maxMIPLevel ) {

    vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );

    #ifdef ENVMAP_TYPE_CUBE

      vec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );

      // TODO: replace with properly filtered cubemaps and access the irradiance LOD level, be it the last LOD level
      // of a specular cubemap, or just the default level of a specially created irradiance cubemap.

      #ifdef TEXTURE_LOD_EXT

        vec4 envMapColor = textureCubeLodEXT( envMap, queryVec, float( maxMIPLevel ) );

      #else

        // force the bias high to get the last LOD level as it is the most blurred.
        vec4 envMapColor = textureCube( envMap, queryVec, float( maxMIPLevel ) );

      #endif

      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;

    #elif defined( ENVMAP_TYPE_CUBE_UV )

      vec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );
      vec4 envMapColor = textureCubeUV( queryVec, 1.0 );

    #else

      vec4 envMapColor = vec4( 0.0 );

    #endif

    return PI * envMapColor.rgb * envMapIntensity;

  }

  // taken from here: http://casual-effects.blogspot.ca/2011/08/plausible-environment-lighting-in-two.html
  float getSpecularMIPLevel( const in float blinnShininessExponent, const in int maxMIPLevel ) {

    //float envMapWidth = pow( 2.0, maxMIPLevelScalar );
    //float desiredMIPLevel = log2( envMapWidth * sqrt( 3.0 ) ) - 0.5 * log2( pow2( blinnShininessExponent ) + 1.0 );

    float maxMIPLevelScalar = float( maxMIPLevel );
    float desiredMIPLevel = maxMIPLevelScalar + 0.79248 - 0.5 * log2( pow2( blinnShininessExponent ) + 1.0 );

    // clamp to allowable LOD ranges.
    return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );

  }

  vec3 getLightProbeIndirectRadiance( /*const in SpecularLightProbe specularLightProbe,*/ const in GeometricContext geometry, const in float blinnShininessExponent, const in int maxMIPLevel ) {

    #ifdef ENVMAP_MODE_REFLECTION

      vec3 reflectVec = reflect( -geometry.viewDir, geometry.normal );

    #else

      vec3 reflectVec = refract( -geometry.viewDir, geometry.normal, refractionRatio );

    #endif

    reflectVec = inverseTransformDirection( reflectVec, viewMatrix );

    float specularMIPLevel = getSpecularMIPLevel( blinnShininessExponent, maxMIPLevel );

    #ifdef ENVMAP_TYPE_CUBE

      vec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );

      #ifdef TEXTURE_LOD_EXT

        vec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );

      #else

        vec4 envMapColor = textureCube( envMap, queryReflectVec, specularMIPLevel );

      #endif

      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;

    #elif defined( ENVMAP_TYPE_CUBE_UV )

      vec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );
      vec4 envMapColor = textureCubeUV(queryReflectVec, BlinnExponentToGGXRoughness(blinnShininessExponent));

    #elif defined( ENVMAP_TYPE_EQUIREC )

      vec2 sampleUV;
      sampleUV.y = asin( clamp( reflectVec.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
      sampleUV.x = atan( reflectVec.z, reflectVec.x ) * RECIPROCAL_PI2 + 0.5;

      #ifdef TEXTURE_LOD_EXT

        vec4 envMapColor = texture2DLodEXT( envMap, sampleUV, specularMIPLevel );

      #else

        vec4 envMapColor = texture2D( envMap, sampleUV, specularMIPLevel );

      #endif

      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;

    #elif defined( ENVMAP_TYPE_SPHERE )

      vec3 reflectView = normalize( ( viewMatrix * vec4( reflectVec, 0.0 ) ).xyz + vec3( 0.0,0.0,1.0 ) );

      #ifdef TEXTURE_LOD_EXT

        vec4 envMapColor = texture2DLodEXT( envMap, reflectView.xy * 0.5 + 0.5, specularMIPLevel );

      #else

        vec4 envMapColor = texture2D( envMap, reflectView.xy * 0.5 + 0.5, specularMIPLevel );

      #endif

      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;

    #endif

    return envMapColor.rgb * envMapIntensity;

  }

#endif

#ifdef USE_SHADOWMAP

  #if NUM_DIR_LIGHTS > 0

    uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHTS ];
    varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];

  #endif

  #if NUM_SPOT_LIGHTS > 0

    uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHTS ];
    varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHTS ];

  #endif

  #if NUM_POINT_LIGHTS > 0

    uniform sampler2D pointShadowMap[ NUM_POINT_LIGHTS ];
    varying vec4 vPointShadowCoord[ NUM_POINT_LIGHTS ];

  #endif

  /*
  #if NUM_RECT_AREA_LIGHTS > 0

    // TODO (abelnation): create uniforms for area light shadows

  #endif
  */

  float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {

    return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );

  }

  float texture2DShadowLerp( sampler2D depths, vec2 size, vec2 uv, float compare ) {

    const vec2 offset = vec2( 0.0, 1.0 );

    vec2 texelSize = vec2( 1.0 ) / size;
    vec2 centroidUV = floor( uv * size + 0.5 ) / size;

    float lb = texture2DCompare( depths, centroidUV + texelSize * offset.xx, compare );
    float lt = texture2DCompare( depths, centroidUV + texelSize * offset.xy, compare );
    float rb = texture2DCompare( depths, centroidUV + texelSize * offset.yx, compare );
    float rt = texture2DCompare( depths, centroidUV + texelSize * offset.yy, compare );

    vec2 f = fract( uv * size + 0.5 );

    float a = mix( lb, lt, f.y );
    float b = mix( rb, rt, f.y );
    float c = mix( a, b, f.x );

    return c;

  }

  float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

    float shadow = 1.0;

    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;

    // if ( something && something ) breaks ATI OpenGL shader compiler
    // if ( all( something, something ) ) using this instead

    bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );

    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );

    bool frustumTest = all( frustumTestVec );

    if ( frustumTest ) {

    #if defined( SHADOWMAP_TYPE_PCF )

      vec2 texelSize = vec2( 1.0 ) / shadowMapSize;

      float dx0 = - texelSize.x * shadowRadius;
      float dy0 = - texelSize.y * shadowRadius;
      float dx1 = + texelSize.x * shadowRadius;
      float dy1 = + texelSize.y * shadowRadius;

      shadow = (
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
        texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
      ) * ( 1.0 / 9.0 );

    #elif defined( SHADOWMAP_TYPE_PCF_SOFT )

      vec2 texelSize = vec2( 1.0 ) / shadowMapSize;

      float dx0 = - texelSize.x * shadowRadius;
      float dy0 = - texelSize.y * shadowRadius;
      float dx1 = + texelSize.x * shadowRadius;
      float dy1 = + texelSize.y * shadowRadius;

      shadow = (
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy, shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
        texture2DShadowLerp( shadowMap, shadowMapSize, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
      ) * ( 1.0 / 9.0 );

    #else // no percentage-closer filtering:

      shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );

    #endif

    }

    return shadow;

  }

  // cubeToUV() maps a 3D direction vector suitable for cube texture mapping to a 2D
  // vector suitable for 2D texture mapping. This code uses the following layout for the
  // 2D texture:
  //
  // xzXZ
  //  y Y
  //
  // Y - Positive y direction
  // y - Negative y direction
  // X - Positive x direction
  // x - Negative x direction
  // Z - Positive z direction
  // z - Negative z direction
  //
  // Source and test bed:
  // https://gist.github.com/tschw/da10c43c467ce8afd0c4

  vec2 cubeToUV( vec3 v, float texelSizeY ) {

    // Number of texels to avoid at the edge of each square

    vec3 absV = abs( v );

    // Intersect unit cube

    float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
    absV *= scaleToCube;

    // Apply scale to avoid seams

    // two texels less per square (one texel will do for NEAREST)
    v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );

    // Unwrap

    // space: -1 ... 1 range for each square
    //
    // #X##   dim    := ( 4 , 2 )
    //  # #   center := ( 1 , 1 )

    vec2 planar = v.xy;

    float almostATexel = 1.5 * texelSizeY;
    float almostOne = 1.0 - almostATexel;

    if ( absV.z >= almostOne ) {

      if ( v.z > 0.0 )
        planar.x = 4.0 - v.x;

    } else if ( absV.x >= almostOne ) {

      float signX = sign( v.x );
      planar.x = v.z * signX + 2.0 * signX;

    } else if ( absV.y >= almostOne ) {

      float signY = sign( v.y );
      planar.x = v.x + 2.0 * signY + 2.0;
      planar.y = v.z * signY - 2.0;

    }

    // Transform to UV space

    // scale := 0.5 / dim
    // translate := ( center + 0.5 ) / dim
    return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );

  }

  float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {

    vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );

    // for point lights, the uniform @vShadowCoord is re-purposed to hold
    // the vector from the light to the world-space position of the fragment.
    vec3 lightToPosition = shadowCoord.xyz;

    // dp = normalized distance from light to fragment position
    float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear ); // need to clamp?
    dp += shadowBias;

    // bd3D = base direction 3D
    vec3 bd3D = normalize( lightToPosition );

    #if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT )

      vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;

      return (
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
        texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
      ) * ( 1.0 / 9.0 );

    #else // no percentage-closer filtering

      return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );

    #endif

  }

#endif

float getShadowMask() {

  float shadow = 1.0;

  #ifdef USE_SHADOWMAP

  #if NUM_DIR_LIGHTS > 0

  DirectionalLight directionalLight;

  for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

    directionalLight = directionalLights[ i ];
    shadow *= bool( directionalLight.shadow ) ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

  }

  #endif

  #if NUM_SPOT_LIGHTS > 0

  SpotLight spotLight;

  for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

    spotLight = spotLights[ i ];
    shadow *= bool( spotLight.shadow ) ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;

  }

  #endif

  #if NUM_POINT_LIGHTS > 0

  PointLight pointLight;

  for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

    pointLight = pointLights[ i ];
    shadow *= bool( pointLight.shadow ) ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;

  }

  #endif

  /*
  #if NUM_RECT_AREA_LIGHTS > 0

    // TODO (abelnation): update shadow for Area light

  #endif
  */

  #endif

  return shadow;

}


void main() {

  gl_FragColor = vec4(color, opacity * ( 1.0 - getShadowMask() ) );

}