// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

export const VERT = /* glsl */ `#version 300 es
precision highp float;
in vec4 aP0;
in vec4 aP1;
in vec4 aP2;
in vec4 aP3;
in vec4 aP4;
in vec4 aX; // delay, size, phase, spare

uniform float uFrom;
uniform float uTo;
uniform float uMix;
uniform float uTime;
uniform float uMotion;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform float uAspect;
uniform float uSize;
uniform float uPR;
uniform float uScrollVel;
uniform vec3 uTrail[8]; // cursor wake: ndc xy, strength

out float vAlpha;
out float vHeat;

${NOISE}

vec4 pick(float i){
  if(i<0.5) return aP0;
  if(i<1.5) return aP1;
  if(i<2.5) return aP2;
  if(i<3.5) return aP3;
  return aP4;
}

void main(){
  // Each particle leaves a little later than the last, so shapes pour into each other.
  float d = aX.x * 0.5;
  float t = smoothstep(d, d + 0.5, uMix);
  vec4 a = pick(uFrom);
  vec4 b = pick(uTo);
  vec3 p = mix(a.xyz, b.xyz, t);
  float bright = mix(a.w, b.w, t);

  // Drift: a slow curl of noise, much stronger while in flight between shapes.
  float flight = sin(t * 3.14159);
  float tm = uTime * 0.12 * uMotion;
  vec3 q = p * 0.32 + vec3(aX.z * 3.0);
  vec3 n = vec3(snoise(q + vec3(0.0, 0.0, tm)), snoise(q + vec3(19.1, 0.0, tm)), snoise(q + vec3(0.0, 33.7, tm)));
  p += n * (0.035 + flight * 1.6);

  vec4 world = uModel * vec4(p, 1.0);
  vec4 view = uView * world;
  vec4 clip = uProj * view;

  // The cursor's wake pushes particles aside and swirls them, like a hand through water.
  vec2 ndc = clip.xy / clip.w;
  vec2 push = vec2(0.0);
  float touch = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 tr = uTrail[i];
    vec2 dm = ndc - tr.xy;
    dm.x *= uAspect;
    float dist = length(dm) + 1e-4;
    float f = exp(-dist * dist * 14.0) * tr.z;
    vec2 dir = dm / dist;
    push += (dir * 0.09 + vec2(-dir.y, dir.x) * 0.07) * f;
    touch += f;
  }
  push.x /= uAspect;
  // Fast scrolling stretches the field like jelly.
  push.y += uScrollVel * (aX.z - 0.5) * 0.06;
  clip.xy += push * clip.w;
  gl_Position = clip;

  // Signals: waves of activity rolling through the shape.
  float fire = smoothstep(0.62, 0.95, snoise(p * 0.75 + vec3(0.0, 0.0, uTime * 0.45 * uMotion)));
  vHeat = clamp(fire * bright * 1.4 + touch * 0.9, 0.0, 1.0);

  float depth = -view.z;
  float fade = clamp(1.25 - (depth - 9.0) / 7.0, 0.15, 1.0);
  vAlpha = (0.16 + 0.84 * bright) * fade;
  gl_PointSize = uSize * aX.y * uPR * (12.0 / depth) * (1.0 + vHeat * 0.6);
}
`

export const FRAG = /* glsl */ `#version 300 es
precision highp float;
in float vAlpha;
in float vHeat;
uniform vec3 uCold;
uniform vec3 uWarm;
uniform vec3 uHot;
uniform float uDim;
out vec4 outColor;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.0, r);
  a *= a;
  vec3 col = mix(uCold, uWarm, smoothstep(0.0, 0.6, vHeat));
  col = mix(col, uHot, smoothstep(0.6, 1.0, vHeat));
  float alpha = a * vAlpha * uDim;
  outColor = vec4(col * alpha, alpha);
}
`
