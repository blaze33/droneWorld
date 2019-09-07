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
const float time = 1.;

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
