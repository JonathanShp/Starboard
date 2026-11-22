// "Shallows": sunlight caustics on clear water, drawn live behind the whole app.
// Battery care: low internal resolution, ~30fps cap, pauses when hidden, one still frame for reduced motion.
const FRAG = `precision mediump float;uniform float t;uniform vec2 r;
void main(){vec2 uv=gl_FragCoord.xy/r.y;float time=t*.3+23.;vec2 p=mod(uv*6.28318*1.15,6.28318)-250.;vec2 i=p;float c=1.;float inten=.005;
for(int n=0;n<5;n++){float tt=time*(1.-(3.5/float(n+1)));i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));c+=1./length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten)));}
c/=5.;c=1.17-pow(c,1.4);float l=clamp(pow(abs(c),8.),0.,1.);vec3 base=vec3(.055,.55,.68);
gl_FragColor=vec4(mix(base,vec3(.84,1.,.98),l*.8),1.);}`;

export function startWater() {
  const c = document.createElement('canvas'); c.id = 'water'; c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  const g = c.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!g) return;
  const sh = (type, src) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); return s; };
  const pr = g.createProgram();
  g.attachShader(pr, sh(g.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}'));
  g.attachShader(pr, sh(g.FRAGMENT_SHADER, FRAG));
  g.linkProgram(pr); g.useProgram(pr);
  g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
  const a = g.getAttribLocation(pr, 'a'); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
  const ut = g.getUniformLocation(pr, 't'), ur = g.getUniformLocation(pr, 'r');
  const size = () => { const k = Math.min(0.55, 420 / innerWidth); c.width = Math.round(innerWidth * k); c.height = Math.round(innerHeight * k); g.viewport(0, 0, c.width, c.height); };
  size(); addEventListener('resize', size);
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const t0 = performance.now(); let last = 0, raf = 0;
  const draw = (now) => { g.uniform1f(ut, (now - t0) / 1000); g.uniform2f(ur, c.width, c.height); g.drawArrays(g.TRIANGLES, 0, 3); };
  const loop = (now) => { raf = requestAnimationFrame(loop); if (now - last < 33) return; last = now; draw(now); };
  const run = () => { cancelAnimationFrame(raf); if (document.hidden) return; if (still.matches) draw(t0 + 4000); else raf = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', run); still.addEventListener?.('change', run);
  run();
}
