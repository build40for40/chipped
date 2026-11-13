// The liquid polish hero, drawn with WebGL 1.
// The stripes (one per month of UK nail imports) are wet lacquer: they wobble slowly, smear where the pointer drags
// through them, and bend around the word "chipped", which is chipped out of the polish down to the bare nail.
// The full stop is a raised drop of polish. Everything is one fragment shader over a full-screen triangle.

export interface PolishOptions {
  canvas: HTMLCanvasElement
  // One RGB colour per stripe, left to right.
  stripes: [number, number, number][]
  word: string
  font: string
  animate: boolean
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
uniform sampler2D uStripes;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uPts[16];   // x, y (0-1, y down), vx, vy
uniform float uAge[16];  // 0 = fresh, 1 = gone

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

vec4 mask(vec2 uv){ return texture2D(uMask, uv); }

void main(){
  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  float aspect = uRes.x / uRes.y;
  vec2 q = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.12;

  // Slow liquid wobble.
  vec2 disp = vec2(fbm(q * 1.6 + vec2(t, -t * 0.7)), fbm(q * 1.6 + vec2(4.7 - t * 0.5, t))) - 0.5;
  disp *= 0.013;

  // Pointer smear: pull colour from behind each recent pointer position, along its motion.
  for (int i = 0; i < 16; i++){
    vec2 d = q - vec2(uPts[i].x * aspect, uPts[i].y);
    float fall = exp(-dot(d, d) / 0.012) * (1.0 - uAge[i]);
    disp -= uPts[i].zw * fall * 0.9;
  }

  // The polish bends around the letters: push along the gradient of the blurred word.
  vec2 px = 1.0 / uRes;
  float gx = mask(uv + vec2(px.x * 6.0, 0.0)).g - mask(uv - vec2(px.x * 6.0, 0.0)).g;
  float gy = mask(uv + vec2(0.0, px.y * 6.0)).g - mask(uv - vec2(0.0, px.y * 6.0)).g;
  disp += vec2(gx, gy) * 0.05;

  vec3 col = texture2D(uStripes, vec2(clamp(uv.x + disp.x, 0.0, 1.0), 0.5)).rgb;

  // Wet gloss: a height field from the same noise, lit from the top left.
  float h0 = fbm(q * 1.2 + disp * 20.0 + vec2(t * 0.5, 0.0));
  float hx = fbm(q * 1.2 + disp * 20.0 + vec2(t * 0.5 + 0.01, 0.0));
  float hy = fbm(q * 1.2 + disp * 20.0 + vec2(t * 0.5, 0.01));
  vec3 n = normalize(vec3((h0 - hx) * 4.0, (h0 - hy) * 4.0, 1.0));
  vec3 L = normalize(vec3(-0.45, -0.6, 0.9));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 30.0);
  // A soft band of light sliding slowly across the wet surface, plus a highlight along the top.
  float band = (uv.x * 0.55 + uv.y) - (fract(uTime * 0.035) * 2.6 - 0.6);
  float sweep = exp(-band * band / 0.012) * 0.16;
  float sheen = (1.0 - smoothstep(0.0, 0.28, uv.y)) * 0.14;
  col += vec3(spec * 0.22 + sheen + sweep);
  col *= 0.94 + 0.06 * (1.0 - uv.y);

  // The chipped word: a rough threshold on the softly blurred letters gives broken, chipped edges.
  float edgeNoise = (noise(q * 90.0) - 0.5) * 0.35 + (noise(q * 22.0) - 0.5) * 0.25;
  float m = smoothstep(0.47, 0.53, mask(uv).r + edgeNoise);
  // Bevel: compare with the word shifted towards the light. Inside the chip, the up-light edge is in shadow.
  vec2 off = vec2(-0.45, -0.6) * px * 5.0;
  float mShift = smoothstep(0.47, 0.53, mask(uv + off).r + (noise((q + off * vec2(aspect, 1.0)) * 90.0) - 0.5) * 0.35 + (noise((q + off * vec2(aspect, 1.0)) * 22.0) - 0.5) * 0.25);
  vec3 nail = mix(vec3(0.965, 0.87, 0.835), vec3(0.93, 0.81, 0.77), noise(q * 40.0) * 0.6 + uv.y * 0.4);
  // Faint ridges of a real nail plate.
  nail *= 0.97 + 0.03 * sin(uv.x * uRes.x * 0.18 + noise(q * 8.0) * 6.0);
  float shadow = clamp(m - mShift, 0.0, 1.0);
  float lit = clamp(mShift - m, 0.0, 1.0);
  nail *= 1.0 - shadow * 0.45;
  col = mix(col, nail, m);
  // Polish rim: a thin bright lip where the lacquer breaks off, on the side facing the light.
  col += vec3(lit * 0.35 * (1.0 - m));
  col *= 1.0 - shadow * (1.0 - m) * 0.2;

  // The full stop: a raised drop of fresh lacquer.
  float drop = smoothstep(0.45, 0.55, mask(uv).b);
  float dropEdge = mask(uv - off * 1.5).b - mask(uv + off * 1.5).b;
  vec3 lac = vec3(0.79, 0.25, 0.36) * (0.85 + 0.25 * clamp(dropEdge * 3.0, -1.0, 1.0));
  float glint = mask(uv).a;
  col = mix(col, lac + glint * 0.75, drop);

  gl_FragColor = vec4(col, 1.0);
}`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader failed')
  return s
}

// Paints the word into three channels: r = word lightly blurred (for chipped edges), g = word heavily blurred
// (for the flow to bend around), b = the full stop, a = the glint on the full stop. Returns the word's box so the page can place real text there.
function paintMask(w: number, h: number, word: string, font: string, dpr: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const size = Math.min(h * 0.62, w * 0.2)
  g.font = `800 ${size}px ${font}`
  const metrics = g.measureText(word)
  const x = Math.max(w * 0.05, 24 * dpr)
  const y = h * 0.5 + size * 0.34
  const dotR = size * 0.11
  const dotX = x + metrics.width + dotR * 1.4
  const dotY = y - dotR
  const layer = (blur: number, draw: (g: CanvasRenderingContext2D) => void) => {
    g.clearRect(0, 0, w, h)
    g.fillStyle = '#000'
    g.fillRect(0, 0, w, h)
    g.filter = blur ? `blur(${blur}px)` : 'none'
    g.fillStyle = '#fff'
    draw(g)
    g.filter = 'none'
    return g.getImageData(0, 0, w, h).data
  }
  const text = (g: CanvasRenderingContext2D) => g.fillText(word, x, y)
  const r = layer(2 * dpr, text)
  const gr = layer(26 * dpr, text)
  const b = layer(1.5 * dpr, (g) => {
    g.beginPath()
    g.arc(dotX, dotY, dotR, 0, Math.PI * 2)
    g.fill()
  })
  // a = the glint on the drop: a small soft spot up and to the left of its centre.
  const a = layer(dotR * 0.18, (g) => {
    g.beginPath()
    g.ellipse(dotX - dotR * 0.35, dotY - dotR * 0.4, dotR * 0.28, dotR * 0.18, -0.6, 0, Math.PI * 2)
    g.fill()
  })
  const out = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = r[i * 4]!
    out[i * 4 + 1] = gr[i * 4]!
    out[i * 4 + 2] = b[i * 4]!
    out[i * 4 + 3] = a[i * 4]!
  }
  return out
}

export function startPolish(opts: PolishOptions): (() => void) | null {
  const { canvas } = opts
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false })
  if (!gl) return null
  let prog: WebGLProgram
  try {
    prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed')
  } catch (e) {
    console.warn('Polish hero fell back to plain stripes:', (e as Error).message.slice(0, 200))
    return null
  }
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const texture = (unit: number) => {
    const t = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, unit === 0 ? gl.NEAREST : gl.LINEAR)
    return t
  }
  texture(0)
  const px = new Uint8Array(opts.stripes.length * 4)
  opts.stripes.forEach(([r, g, b], i) => px.set([r, g, b, 255], i * 4))
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, opts.stripes.length, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, px)
  const maskTex = texture(1)

  const u = (n: string) => gl.getUniformLocation(prog, n)
  gl.uniform1i(u('uStripes'), 0)
  gl.uniform1i(u('uMask'), 1)
  const uRes = u('uRes')
  const uTime = u('uTime')
  const uPts = u('uPts')
  const uAge = u('uAge')

  const pts = new Float32Array(16 * 4)
  const born = new Float64Array(16).fill(-1e9)
  const ages = new Float32Array(16).fill(1)
  let head = 0
  let last: { x: number; y: number; at: number } | null = null

  let w = 0
  let h = 0
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const nw = Math.round(canvas.clientWidth * dpr)
    const nh = Math.round(canvas.clientHeight * dpr)
    if (nw === 0 || nh === 0) return false
    if (nw === w && nh === h) return true
    w = canvas.width = nw
    h = canvas.height = nh
    gl!.viewport(0, 0, w, h)
    gl!.activeTexture(gl!.TEXTURE1)
    gl!.bindTexture(gl!.TEXTURE_2D, maskTex)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, paintMask(w, h, opts.word, opts.font, dpr))
    gl!.uniform2f(uRes, w, h)
    return true
  }

  function onMove(e: PointerEvent) {
    const r = canvas.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const now = performance.now()
    if (last) {
      const dt = Math.max(16, now - last.at)
      const vx = Math.max(-0.08, Math.min(0.08, ((x - last.x) / dt) * 16 * (r.width / r.height)))
      const vy = Math.max(-0.08, Math.min(0.08, ((y - last.y) / dt) * 16))
      pts.set([x, y, vx, vy], head * 4)
      born[head] = now
      head = (head + 1) % 16
    }
    last = { x, y, at: now }
    if (!opts.animate) frame(now)
  }
  const onLeave = () => (last = null)

  const start = performance.now()
  let raf = 0
  let visible = true
  function frame(now: number) {
    if (!resize()) return
    for (let i = 0; i < 16; i++) ages[i] = Math.min(1, (now - born[i]!) / 1400)
    gl!.uniform4fv(uPts, pts)
    gl!.uniform1fv(uAge, ages)
    gl!.uniform1f(uTime, opts.animate ? (now - start) / 1000 : 0)
    gl!.drawArrays(gl!.TRIANGLES, 0, 3)
  }
  function loop(now: number) {
    if (visible && !document.hidden) frame(now)
    raf = requestAnimationFrame(loop)
  }

  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting))
  io.observe(canvas)
  // Draw straight away and on every resize, so the word shows even if animation frames are held back.
  const ro = new ResizeObserver(() => frame(performance.now()))
  ro.observe(canvas)
  frame(performance.now())
  if (opts.animate) raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    ro.disconnect()
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerleave', onLeave)
  }
}
