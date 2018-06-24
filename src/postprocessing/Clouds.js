import {
  Matrix4,
  Vector3
} from 'three'

const CloudsShader = {
  uniforms: {
    tDepth: { type: 't', value: null },
    tColor: { type: 't', value: null },

    cameraNear: { type: 'f', value: 1 },
    cameraFar: { type: 'f', value: 1e6 },

    clipToWorldMatrix: { type: 'm4', value: new Matrix4() },
    cameraPosition: { type: 'v3', value: new Vector3() },
    sun: { type: 'v3', value: new Vector3() }

  },

  vertexShader: `
    varying vec2 vUv;

    void main() {

      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      vUv = uv;

    }
  `,
  fragmentShader: `
  varying vec2 vUv;

  uniform sampler2D tDepth;
  uniform sampler2D tColor;

  uniform mat4 clipToWorldMatrix;
  uniform vec3 sun;

  uniform float cameraNear;
  uniform float cameraFar;

  mat3 m = mat3( 0.00,  0.80,  0.60,
              -0.80,  0.36, -0.48,
              -0.60, -0.48,  0.64 );
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
    return p.z + ((fbm(p*0.03)-0.1) + sin(p.x*0.014 + sin(p.y*.001)*7.)*0.4+0.15 + sin(p.y*0.008)*0.1) / 0.007;
    return p.z + ((fbm(p*0.03)-0.1) + sin(p.x*0.024 + sin(p.y*.001)*7.)*0.22+0.15 + sin(p.y*0.008)*0.05) / 0.007;
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
  float d = 0., t = 0.;
  vec4 rz = vec4( 0.0 );
  float l = length(ro - world);
  float td=.0, w;

  for( int i=0; i<250; i++ )
  {
    if(rz.a > 0.99 || t>l) break;

    vec3 pos = ro + t*rd;
    d = map(pos);
    if (d<0.) {
      float den = clamp(-d/200., 0., 1.);

      vec4 col = vec4(mix( vec3(.8,.75,.85), vec3(.0), den ), den);

      col.a *= .9;
      col.rgb *= col.a;
      rz = rz + col*(1.0 - rz.a);
    }

    t += max(1., abs(d) * .49);
  }

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

    // float rz = dikomarch(cameraPosition, dir, worldPosition.xyz);
    // float rz = march(cameraPosition, dir, worldPosition.xyz);
    // color = vec3(rz/700.);
    // if (rz < 7000.)
    // {
      vec4 res = march(cameraPosition, dir, color, worldPosition.xyz);
      color = color*(1.0-res.w) + res.xyz;
    // }
    // color = dir;

    // color.w = 1.;
    // debug: view depth buffer
    // gl_FragColor = texture2D(tColor, vUv);
    // gl_FragColor = vec4(clipPosition.xyz, 1.);
    // gl_FragColor = vec4(normalize(cameraPosition), 1.);
    // gl_FragColor = vec4(vec3(map(worldPosition.xyz)), 1.);
    // gl_FragColor = vec4(vec3(zOverW), 1.);
    // gl_FragColor = vec4((worldPosition.xyz - cameraPosition)/100., 1.);
    // gl_FragColor = vec4(vec3(fbm(cameraPosition + dir)), 1.);
    
    // gl_FragColor = vec4(vec3(rz)/700., 1.);
    // gl_FragColor = vec4(vec3(length(worldPosition.xyz - cameraPosition))/1500., 1.);
    // gl_FragColor = res;
    // gl_FragColor = vec4(col, 1.);
    gl_FragColor = vec4(color, 1.);
    // gl_FragColor = mix(texture2D(tColor, vUv), vec4(color, 1.), clamp(rz/zOverW, 0., 1.));
    
    // gl_FragColor = texture2D(tColor, vUv) + color;
    // gl_FragColor = mix(texture2D(tColor, vUv), vec4(.9), 1. - color.x);
  }
  `
}

export default CloudsShader
