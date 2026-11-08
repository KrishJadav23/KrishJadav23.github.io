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
in vec4 aX; // delay, size, spin/phase, kind+colour
in vec2 aOff; // sand: how far the cursor has pushed this particle, on screen

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
uniform float uFine[5];  // per shape: 0 mostly triangles, 1 only fine points

out float vAlpha;
out float vGlow;
out float vRot;
out float vKind;
out float vTone;
out float vPx;
out float vCode;
out float vGrad;
out float vNear;

${NOISE}

float fineOf(float i){
  if(i<0.5) return uFine[0];
  if(i<1.5) return uFine[1];
  if(i<2.5) return uFine[2];
  if(i<3.5) return uFine[3];
  return uFine[4];
}

vec4 pick(float i){
  if(i<0.5) return aP0;
  if(i<1.5) return aP1;
  if(i<2.5) return aP2;
  if(i<3.5) return aP3;
  return aP4;
}

void main(){
  // Each particle leaves a little later than the last, so shapes pour into each other.
  float d = aX.x * 0.45;
  float t = smoothstep(d, d + 0.55, uMix);
  vec4 a = pick(uFrom);
  vec4 b = pick(uTo);
  vec3 p = mix(a.xyz, b.xyz, t);
  // w carries brightness plus 2 x a colour code (0 own tone, 1 poppy, 2 white, 3 powder).
  float codeA = floor(a.w * 0.5);
  float codeB = floor(b.w * 0.5);
  float bright = mix(a.w - 2.0 * codeA, b.w - 2.0 * codeB, t);
  vCode = t < 0.5 ? codeA : codeB;
  vGrad = smoothstep(2.3, -2.5, p.y); // 0 at the top of a shape, 1 at its base

  // Drift: a slow curl of noise, stronger while in flight.
  float flight = sin(t * 3.14159);
  float tm = uTime * 0.1 * uMotion;
  vec3 q = p * 0.35 + vec3(aX.z * 3.0);
  vec3 n = vec3(snoise(q + vec3(0.0, 0.0, tm)), snoise(q + vec3(19.1, 0.0, tm)), snoise(q + vec3(0.0, 33.7, tm)));
  p += n * (0.03 + flight * 1.1);

  vec4 view = uView * uModel * vec4(p, 1.0);
  vec4 clip = uProj * view;

  // How near this particle is within its own shape: 1 at the front, 0 at the back.
  float centre = (uView * uModel * vec4(0.0, 0.0, 0.0, 1.0)).z;
  float scale = length(uModel[0].xyz);
  vNear = clamp((view.z - centre) / (2.3 * scale) + 0.5, 0.0, 1.0);

  // Sand: the cursor's push, simulated on the CPU per particle, applied on screen.
  vec2 push = aOff;
  float touch = min(1.0, length(aOff) * 9.0);
  push.y += uScrollVel * (aX.z - 0.5) * 0.05;
  clip.xy += push * clip.w;
  gl_Position = clip;

  // Signals: slow waves of light rolling through the shape.
  float fire = smoothstep(0.6, 0.95, snoise(p * 0.7 + vec3(0.0, 0.0, uTime * 0.35 * uMotion)));
  vGlow = clamp(fire * bright + touch * 0.8, 0.0, 1.0);

  float depth = -view.z;
  // Depth: the near side grows and brightens, the far side shrinks into the dark.
  float fade = clamp(1.35 - (depth - 7.4) / 4.0, 0.06, 1.0);
  vAlpha = (0.12 + 0.88 * bright) * fade;

  // Outlined triangles or fine points, in a mix each shape chooses.
  float fine = mix(fineOf(uFrom), fineOf(uTo), t);
  vKind = fract(aX.w * 7.31) > 0.22 + 0.78 * fine ? 1.0 : 0.0;
  vTone = aX.w;
  vRot = aX.z * 6.2832 + uTime * (aX.z - 0.5) * 0.5 * uMotion;
  float px = vKind > 0.5 ? uSize * aX.y : 1.9 + aX.y * 0.8;
  px *= uPR * pow(9.0 / depth, 1.6) * (1.0 + vGlow * 0.35);
  vPx = px;
  gl_PointSize = px;
}
`

export const FRAG = /* glsl */ `#version 300 es
precision highp float;
in float vAlpha;
in float vGlow;
in float vRot;
in float vKind;
in float vTone;
in float vPx;
in float vCode;
in float vGrad;
in float vNear;
uniform vec3 uPowder;
uniform vec3 uInk;
uniform vec3 uPoppy;
uniform float uDim;
out vec4 outColor;

// Signed distance to an equilateral triangle (Inigo Quilez).
float sdTri(vec2 p, float r){
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a;
  if (vKind > 0.5) {
    float cs = cos(vRot);
    float sn = sin(vRot);
    c = mat2(cs, -sn, sn, cs) * c;
    float d = abs(sdTri(c, 0.26));
    float px = 1.0 / max(vPx, 1.0);
    a = 1.0 - smoothstep(px * 0.6, px * 1.8, d);
  } else {
    float r = length(c);
    if (r > 0.5) discard;
    a = smoothstep(0.5, 0.1, r);
  }
  if (a < 0.01) discard;
  vec3 col;
  if (vCode > 0.5 && vCode < 1.5) col = uPoppy;
  else if (vCode > 1.5 && vCode < 2.5) col = uInk;
  else if (vCode > 4.5) {
    // Depth gradient: the far side glows poppy, the middle powder, the nearest surface white.
    col = mix(uPoppy, uPowder, smoothstep(0.18, 0.5, vNear));
    col = mix(col, uInk, smoothstep(0.62, 0.9, vNear));
  }
  else if (vCode > 3.5) {
    // A scan's gradient: powder at the crown, white through the face, poppy at the shoulders,
    // then lifted toward white where the surface comes nearest and cooled where it turns away.
    col = mix(uPowder, uInk, smoothstep(0.05, 0.4, vGrad));
    col = mix(col, uPoppy, smoothstep(0.7, 1.05, vGrad) * 0.6);
    col = mix(col, uInk, smoothstep(0.62, 0.95, vNear) * 0.55);
    col = mix(col, uPowder * 0.75, smoothstep(0.45, 0.1, vNear) * 0.5);
  }
  else if (vCode > 2.5) col = uPowder;
  else col = vTone < 0.035 ? uPoppy : (vTone < 0.28 ? uInk : uPowder);
  col = mix(col, uInk, vGlow * 0.45);
  // Gradient-coloured grain is brighter at the front and recedes toward the back.
  float depthLight = vCode > 3.5 ? 0.45 + 0.75 * vNear : 1.0;
  float alpha = a * vAlpha * uDim * depthLight * (vKind > 0.5 ? 0.62 + vGlow * 0.38 : 0.85 + vGlow * 0.15);
  outColor = vec4(col * alpha, alpha);
}
`

/*
  The ambient layer: always moving, independent of the shapes.
  type 0  wave ribbons flowing across the screen (screen space)
  type 1  axon paths with a signal travelling along each one
*/
export const AMB_VERT = /* glsl */ `#version 300 es
precision highp float;
in vec2 aPos;   // wave: u along the ribbon, ribbon centre y · axon: x, y
in vec4 aData;  // type, param, phase, size
uniform float uTime;
uniform float uAmb;
uniform float uPR;
uniform float uAspect;
out float vA;
out float vHot;
void main(){
  float t = uTime;
  vec2 pos;
  float a;
  float hot = 0.0;
  if (aData.x < 0.5) {
    float x = fract(aPos.x + t * 0.008 * (0.6 + aData.z)) * 2.6 - 1.3;
    float y = aPos.y + 0.07 * sin(x * 2.6 + t * 0.35 + aData.z * 6.0) + 0.025 * sin(x * 7.0 - t * 0.5) + aData.y * 0.035;
    pos = vec2(x, y);
    a = (0.1 + 0.16 * (0.5 + 0.5 * sin(x * 4.0 + t * 0.8 + aData.z * 9.0))) * smoothstep(1.3, 0.9, abs(x));
  } else {
    pos = aPos;
    float head = fract(t * 0.07 + aData.z);
    float d = fract(head - aData.y);
    hot = exp(-d * 30.0);
    a = 0.05 + 0.8 * exp(-d * 9.0);
  }
  gl_Position = vec4(pos, 0.0, 1.0);
  gl_PointSize = aData.w * uPR * (1.0 + hot * 1.4);
  vA = a * uAmb;
  vHot = hot;
}
`

export const AMB_FRAG = /* glsl */ `#version 300 es
precision highp float;
in float vA;
in float vHot;
uniform vec3 uPowder;
uniform vec3 uPoppy;
out vec4 outColor;
void main(){
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float a = smoothstep(0.5, 0.15, r) * vA;
  vec3 col = mix(uPowder, uPoppy, smoothstep(0.55, 1.0, vHot));
  outColor = vec4(col * a, a);
}
`
