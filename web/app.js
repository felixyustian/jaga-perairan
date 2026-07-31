// JAGA PERAIRAN — client-side detection demo.
// Draws a synthetic microscopy field, then detects particles from the actual
// canvas pixels (threshold + connected components), classifies by area.
const N = 512;
const ALERTS = [
  { thr: 0, name: "AMAN", msg: "Kepadatan rendah — pantau rutin.", cls: "ok" },
  { thr: 8, name: "WASPADA", msg: "Kepadatan meningkat — tingkatkan pemantauan.", cls: "warn" },
  { thr: 20, name: "BAHAYA", msg: "Potensi bloom — siapkan mitigasi.", cls: "danger" },
];

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const $ = (id) => document.getElementById(id);
const cv = $("cv"), ctx = cv.getContext("2d");

// draw synthetic field into an ImageData (grayscale in RGB)
function synthField(harmful, benign, seed) {
  const r = rng(seed);
  const buf = new Float64Array(N * N).fill(235);
  for (let i = 0; i < N * N; i++) buf[i] += (r() * 2 - 1) * 4;
  const stamp = (cx, cy, rad, depth) => {
    const R = Math.ceil(rad * 3);
    for (let y = Math.max(0, cy - R); y < Math.min(N, cy + R); y++)
      for (let x = Math.max(0, cx - R); x < Math.min(N, cx + R); x++) {
        const d = ((x - cx) ** 2 + (y - cy) ** 2) / (rad * rad);
        buf[y * N + x] -= depth * Math.exp(-d);
      }
  };
  for (let k = 0; k < benign; k++)
    stamp(10 + Math.floor(r() * (N - 20)), 10 + Math.floor(r() * (N - 20)), 2.5 + r() * 2, 40 + r() * 30);
  for (let k = 0; k < harmful; k++)
    stamp(15 + Math.floor(r() * (N - 30)), 15 + Math.floor(r() * (N - 30)), 6 + r() * 4, 90 + r() * 50);

  const img = ctx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = Math.max(0, Math.min(255, buf[i]));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  return img;
}

// connected components on threshold mask; classify by area
function detect(img) {
  const gray = new Float64Array(N * N);
  let sum = 0;
  for (let i = 0; i < N * N; i++) { gray[i] = img.data[i * 4]; sum += gray[i]; }
  const sorted = Float64Array.from(gray).sort();
  const median = sorted[(N * N) >> 1];
  const thr = median - 70;
  const mask = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) mask[i] = gray[i] < thr ? 1 : 0;

  const seen = new Uint8Array(N * N), stack = new Int32Array(N * N);
  const particles = []; let harmful = 0, benign = 0;
  for (let s = 0; s < N * N; s++) {
    if (!mask[s] || seen[s]) continue;
    let sp = 0; stack[sp++] = s; seen[s] = 1;
    let area = 0, sx = 0, sy = 0, minx = N, miny = N, maxx = 0, maxy = 0;
    while (sp) {
      const p = stack[--sp], px = p % N, py = (p / N) | 0;
      area++; sx += px; sy += py;
      if (px < minx) minx = px; if (px > maxx) maxx = px;
      if (py < miny) miny = py; if (py > maxy) maxy = py;
      const nb = [p - 1, p + 1, p - N, p + N];
      for (const q of nb) if (q >= 0 && q < N * N && mask[q] && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
    }
    if (area < 10) continue;
    const isHarm = area >= 45;
    isHarm ? harmful++ : benign++;
    particles.push({ x: sx / area, y: sy / area, area, box: [minx, miny, maxx, maxy], harm: isHarm });
  }
  let a = ALERTS[0];
  for (const al of ALERTS) if (harmful >= al.thr) a = al;
  return { particles, harmful, benign, total: harmful + benign, alert: a };
}

function run() {
  const harm = +$("harm").value, ben = +$("ben").value, seed = +$("seed").value;
  const img = synthField(harm, ben, seed);
  ctx.putImageData(img, 0, 0);
  const res = detect(img);
  // overlay
  res.particles.forEach((p) => {
    const [x0, y0, x1, y1] = p.box;
    ctx.strokeStyle = p.harm ? "#b02e4a" : "#0E6E6E";
    ctx.lineWidth = p.harm ? 2 : 1;
    ctx.strokeRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  });
  const a = res.alert;
  $("alert").className = "alertbox " + a.cls;
  $("alert").innerHTML = `<div class="alvl">${a.name}</div><div class="amsg">${a.msg}</div>`;
  $("stats").innerHTML = `
    <table>
      <tr><td>Spesies berbahaya</td><td><b>${res.harmful}</b></td></tr>
      <tr><td>Partikel benign</td><td>${res.benign}</td></tr>
      <tr><td>Total partikel</td><td>${res.total}</td></tr>
    </table>
    <div class="legend"><span class="sw harm"></span> harmful-like &nbsp;
      <span class="sw ben"></span> benign</div>`;
}
["harm", "ben"].forEach((id) => $(id).addEventListener("input", () => { $(id + "_v").textContent = $(id).value; }));
$("run").addEventListener("click", run);
run();
