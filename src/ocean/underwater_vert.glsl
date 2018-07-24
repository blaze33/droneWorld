 #include <fog_pars_vertex>

uniform mat4 textureMatrix;

varying vec4 vCoord;
varying vec2 vUv;
varying vec3 vToEye;

void main() {

vUv = uv;
vCoord = textureMatrix * vec4( position, 1.0 );

vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
vToEye = cameraPosition - worldPosition.xyz;

vec4 mvPosition = viewMatrix * worldPosition; // used in fog_vertex
gl_Position = projectionMatrix * mvPosition;

#include <fog_vertex>

}