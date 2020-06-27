#define STANDARD

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

// ####### custom uniforms #########
uniform sampler2D rockTexture;
uniform sampler2D rockTextureNormal;
// #################################

#ifndef STANDARD
	uniform float clearCoat;
	uniform float clearCoatRoughness;
#endif

varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal2;
varying float flatness;

#ifndef FLAT_SHADED

	varying vec3 vNormal;

#endif

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <lights_pars_begin>
#include <envmap_physical_pars_fragment>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>

// #include <normalmap_pars_fragment>
#ifdef USE_NORMALMAP

	uniform sampler2D normalMap;
	uniform vec2 normalScale;

	// Per-Pixel Tangent Space Normal Mapping
	// http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html

	vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, sampler2D normalMap) {

		// Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988

		vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
		vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
		vec2 st0 = dFdx( vUv.st );
		vec2 st1 = dFdy( vUv.st );

		vec3 S = normalize( q0 * st1.t - q1 * st0.t );
		vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
		vec3 N = normalize( surf_norm );

		vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
		mapN.xy = normalScale * mapN.xy;
		mat3 tsn = mat3( S, T, N );
		return normalize( tsn * mapN );

	}

#endif

#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

vec4 physicalColor(sampler2D map, sampler2D normalMap, float roughness, float metalness) {
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	vec2 vUvXY = vec2(mod(vWorldPosition.x, 100.0) / 100.0, mod(vWorldPosition.y, 100.0) / 100.0 );
	vec2 vUvXZ = vec2(mod(vWorldPosition.x, 100.0) / 100.0 , mod(vWorldPosition.z, 100.0) / 100.0 );
	vec2 vUvYZ = vec2(mod(vWorldPosition.y, 100.0) / 100.0 , mod(vWorldPosition.z, 100.0) / 100.0 );

	vec3 mixer = clamp(abs(vNormal2), 0.0, 1.0);

	#include <logdepthbuf_fragment>

	// #include <map_fragment>
	vec4 texelColorXY = texture2D( map, vUvXY );
	vec4 texelColorXZ = texture2D( map, vUvXZ );
	vec4 texelColorYZ = texture2D( map, vUvYZ );
	vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
	vec4 texelColor = (
		mix(black, texelColorXY, pow(mixer.z, 2.5)) +
		mix(black, texelColorXZ, pow(mixer.y, 2.5)) +
		mix(black, texelColorYZ, pow(mixer.x, 2.5))
	);
	// texelColor = texelColorXY;

	// texelColor = mapTexelToLinear( texelColor );
	diffuseColor *= texelColor;
	// return diffuseColor;

	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	// #include <normal_fragment_maps>
	normal = perturbNormal2Arb( -vViewPosition, normal, normalMap);

	#include <emissivemap_fragment>

	// accumulation
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	// #include <specularmap_fragment>
	// #include <envmap_fragment>
	// return vec4(envColor.rgb, 1.0);
	return vec4(outgoingLight, diffuseColor.a);
}

void main() {

	#include <clipping_planes_fragment>

	vec4 grassColor = physicalColor(map, normalMap, roughness, metalness);
	vec4 rockColor = physicalColor(rockTexture, rockTextureNormal, 0.4, 0.15);
	vec4 colorTerrain = mix(
		rockColor,
		grassColor,
		smoothstep(0.6, 0.7, flatness)
	);
	gl_FragColor = colorTerrain;
	// gl_FragColor = vec4(vec3(vWorldPosition.z/100.0), 1.0);
	vec3 outgoingLight = gl_FragColor.rgb;
	#include <specularmap_fragment>
	#include <envmap_fragment>
	gl_FragColor = vec4(outgoingLight.rgb, gl_FragColor.a);


	// gl_FragColor = vec4(material.specularColor, 1.0);
	// gl_FragColor = vec4(reflectedLight.indirectDiffuse, 1.0);
	// gl_FragColor = vec4(directLight.direction, 1.0);
	// // gl_FragColor = texture2D(map, vUv);
	// gl_FragColor = vec4(normal, 1.0);
	// gl_FragColor = vec4(material.diffuseColor, 1.0);
	// gl_FragColor = vec4(metalness, metalness, metalness, 1.0);
	// gl_FragColor = vec4(diffuseColor.rgb * ( 1.0 - metalnessFactor ), 1.0);
	// gl_FragColor = vec4(outgoingLight, diffuseColor.a);

	#include <tonemapping_fragment>
	#include <encodings_fragment>

	#include <fog_fragment>

	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

	// gl_FragColor = vec4(normal, 1.0);

}
