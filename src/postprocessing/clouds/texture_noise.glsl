
vec4 noise3D(vec3 p)
{
    p.z = fract(p.z)*512.0;
    float iz = floor(p.z);
    float fz = fract(p.z);
    vec2 a_off = vec2(23.0, 29.0)*(iz)/512.0;
    vec2 b_off = vec2(23.0, 29.0)*(iz+1.0)/512.0;
    vec4 a = texture2D(tNoise, p.xy + a_off, -99.);
    vec4 b = texture2D(tNoise, p.xy + b_off, -99.);
    return mix(a, b, fz);
}

float noise3D_b(vec3 p) {
	float a = texture2D(tNoise, p.xy, -99.).r;
    float b = texture2D(tNoise, p.xz, -99.).r;
    float c = texture2D(tNoise, p.yz, -99.).r;
	return (a + b + c - 1.5);
}

float fbm3D( vec3 p )
{
	float f;
	f  = 0.5000*noise3D_b( p ); p = m*p*2.02;
	f += 0.2500*noise3D_b( p ); p = m*p*2.03;
	f += 0.1250*noise3D_b( p );
	return f;
}