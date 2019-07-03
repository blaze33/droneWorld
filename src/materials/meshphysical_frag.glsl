#define PHYSICAL

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
#include <normalmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

vec4 physicalColor(sampler2D map, sampler2D normalMap, float roughness, float metalness) {
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
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
	vec3 normal = normalize( vNormal2 );
	normal = perturbNormal2Arb( -vViewPosition, normal );
	float flatness = dot(normal, vec3(0.0, 0.0, 1.0));
	vec4 colorTerrain = mix(
		rockColor,
		// rockColor,
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

	//  FOG
	// #include <fog_fragment>
	reflectVec = refract( cameraToVertex, worldNormal, 1.0 );
	vec4 fogColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	float fogFactor = whiteCompliment( exp2( - fogDensity * fogDensity * fogDepth * fogDepth * LOG2 ) );
	fogFactor = mix(fogFactor, fogFactor / 10.0, smoothstep(100.0, 300.0, vWorldPosition.z));
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor.rgb, fogFactor );

	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

}
