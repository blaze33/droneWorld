precision highp float;
precision highp int;
#define USE_FOG

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform mat3 uvTransform;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec2 uv2;

varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vNormal2;
varying float flatness;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying vec2 vUv2;
varying float fogDepth;

void main() {

	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	vUv2 = uv2;

	vec3 objectNormal = vec3( normal );

	vec3 transformedNormal = normalMatrix * objectNormal;


	vNormal = normalize( transformedNormal );

	vec3 transformed = vec3( position );

	vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
	gl_Position = projectionMatrix * mvPosition;


	vViewPosition = - mvPosition.xyz;

	// #include <worldpos_vertex>
	vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

	fogDepth = -mvPosition.z;

	vNormal2 = normalize(normal);
	flatness = dot(normal, vec3(0.0, 0.0, 1.0));
  	vWorldPosition = position;
}
