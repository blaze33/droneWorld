#include <common>

varying vec2 vUv;

uniform sampler2D tDepth;
uniform sampler2D tColor;

uniform mat4 clipToWorldMatrix;
uniform vec3 sun;

uniform float cameraNear;
uniform float cameraFar;

float LOW_CLOUDS = 500.;
float HIGH_CLOUDS = 1000.;
float CLOUDS_STEP = 100.;

mat3 m = mat3(
	 0.00,  0.80,  0.60,
	-0.80,  0.36, -0.48,
  -0.60, -0.48,  0.64
);
float hash( float n )
{
  return fract(sin(n)*43758.5453);
}

float noise( in vec3 x )
{
	vec3 p = floor(x);
	vec3 f = fract(x);

	f = f*f*(3.0-2.0*f);

	float n = p.x + p.y*57.0 + 113.0*p.z;

	float res = mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
											mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
									mix(mix( hash(n+113.0), hash(n+114.0),f.x),
											mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
	return res;
}

float fbm( vec3 p )
{
	float f;
	f  = 0.5000*noise( p ); p = m*p*2.02;
	f += 0.2500*noise( p ); p = m*p*2.03;
	f += 0.1250*noise( p );
	return f;
}

float map(vec3 p){
	float cloudLevel = (
		  smoothstep(HIGH_CLOUDS - CLOUDS_STEP, HIGH_CLOUDS, p.z)
		- smoothstep(LOW_CLOUDS, LOW_CLOUDS + CLOUDS_STEP, p.z)
	);
	// return cloudLevel + (fbm(p*0.03)) / 0.007;
	return cloudLevel * (fbm(p*0.03) * 33. + fbm(p*0.01) * 100. - 66.);
	// return cloudLevel + (
	// 	  (fbm(p*0.03)-0.1)
	// 	+ sin(p.x*0.024 + sin(p.y*.001)*7.)*0.22+0.15
	// 	+ sin(p.y*0.008)*0.05
	// ) / 0.007;
	// return p.z - 300. + ((fbm(p*0.03)-0.1) + sin(p.x*0.014 + sin(p.y*.001)*7.)*0.4+0.15 + sin(p.y*0.008)*0.1) / 0.007;
	// return p.z + ((fbm(p*0.03)-0.1) + sin(p.x*0.024 + sin(p.y*.001)*7.)*0.22+0.15 + sin(p.y*0.008)*0.05) / 0.007;
}

float getres (in vec3 ro, in vec3 rd, in float z) {
  return map(ro + rd * z);
}

float dikomarch(in vec3 ro, in vec3 rd, in vec3 world)
{
	float precis = .3;
	float d = 0.;
	float z0 = 1.;
	float z1 = length(world - ro);
	for (int i = 0; i < 8; i++) {
		float res0 = getres(ro, rd, z0);
		float res1 = getres(ro, rd, z1);
		float mid = (z0+z1)/2.;
		float resmid = getres(ro, rd, mid);
		z0 = sign(res0) == sign(resmid) ? mid : z0;
		z1 = sign(res1) == sign(resmid) ? mid : z1;
		d = z0;
		if (z0==z1) break;
	}
	float h= .0;
	for( int i=0; i<8; i++ )
	{
		if( abs(h)<precis) break;
		d += h;
		vec3 pos = ro+rd*d;
		h = map(pos);
	}
	return d;
}

vec4 march(in vec3 ro, in vec3 rd, in vec3 bgc, in vec3 world)
{
  float d = 0.;
  vec4 rz = vec4( 0.0 ), col;
  float td=.0, w, den;
	vec3 cloudColor = vec3(.8,.75,.85);
	vec3 pos;

	vec3 hitPointLow = linePlaneIntersect(ro, rd, vec3(0., 0., LOW_CLOUDS), vec3(0., 0., -1.));
	vec3 hitPointHigh = linePlaneIntersect(ro, rd, vec3(0., 0., HIGH_CLOUDS), vec3(0., 0., -1.));
	float lowCloudDirection = dot(hitPointLow - ro, rd);
	float highCloudDirection = dot(hitPointHigh - ro, rd);
  float hitDistanceLow = lowCloudDirection > 0. ? length(hitPointLow - ro) : 1e7;
  float hitDistanceHigh = highCloudDirection > 0. ? length(hitPointHigh - ro) : 1e7;
	bool inClouds = (ro.z > LOW_CLOUDS) && (ro.z < HIGH_CLOUDS);
	bool lowCloudLook = hitDistanceLow < hitDistanceHigh;
	float hitDistance = lowCloudLook ? hitDistanceLow : hitDistanceHigh;

	if (hitDistance == 1e7) {return vec4(0.);}

	float cloudDepth = inClouds ? hitDistance : (
		abs(hitDistanceHigh - hitDistanceLow)
	);
	float cloudDistance = inClouds ? 0. : min(hitDistanceHigh, hitDistanceLow);

	float l = min(cloudDistance + cloudDepth, length(ro - world));
	float t = cloudDistance;

  for( int i=0; i<100; i++ )
  {
    if(rz.a > 0.99 || t>l) break;

    pos = ro + t*rd;
    d = map(pos);
    if (d<0.) {
      den = clamp(-d / 66., 0., 1.);
      // col = vec4(mix(bgc, cloudColor, den ), den * 0.9);
      col = vec4(vec3(1.), den * 0.9);
      col.rgb *= col.a;
      rz = rz + col*(1.0 - rz.a);
    }

		t += max(15., abs(d));
		// t += 2.;
    // t += max(2., d / 2.);
    // t += clamp(abs(1. / min(d, .01)),1., 10.);
    // t += min(cloudDepth / 500., 50.);
  }

	// float viewCloudDepth = max(l - cloudDistance, 0.);
	// float depthFactor = whiteCompliment( exp2( - 1e-8 * viewCloudDepth * viewCloudDepth * LOG2 ) );
  // rz = mix( rz, vec4(cloudColor * 0.9, 0.9), depthFactor );
	// rz.rgb = vec3(depthFactor);


  // return clamp(vec4(cloudDepth / 2000.), 0., 1.);
  // return clamp(vec4(cloudDistance / 2000.), 0., 1.);
  return clamp(rz, 0., 1.);
}


#include <packing>

float readDepth(sampler2D depthSampler, vec2 coord) {
	return texture2D(depthSampler, coord).x;
	float fragCoordZ = texture2D(depthSampler, coord).x;
	float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
	return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
}

void main() {

	float zOverW = readDepth(tDepth, vUv);

	// clipPosition is the viewport position at this pixel in the range -1 to 1.
	vec4 clipPosition = vec4(vUv.x * 2. - 1., vUv.y * 2. - 1., zOverW * 2. - 1., 1.);

	vec4 worldPosition = clipToWorldMatrix * clipPosition;
	worldPosition /= worldPosition.w;

	vec3 color = texture2D(tColor, vUv).rgb;
	vec3 dir = normalize(worldPosition.xyz - cameraPosition);

	vec4 res = march(cameraPosition, dir, color, worldPosition.xyz);
	color = color*(1.0-res.w) + res.xyz;

	gl_FragColor = vec4(color, 1.);
	// gl_FragColor = vec4(vec3(fbm(worldPosition.xyz * .03) * fbm(worldPosition.xyz * .003)), 1.);
	// gl_FragColor = vec4(vec3(noise(worldPosition.xyz)), 1.);
	// gl_FragColor = vec4(vec3(snoise(worldPosition.xyz)), 1.);

}
