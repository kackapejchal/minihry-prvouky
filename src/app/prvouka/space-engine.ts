/**
 * Data planet a 2D kreslení pro model fází Měsíce (3. ročník, 1. díl). Planety mají
 * procedurální povrch a stín na straně odvrácené od Slunce; stejný kód vykreslil obrázky
 * planet a Měsíce v `public/prvouka/tretak`. 3D model Sluneční soustavy je v `solar-3d.ts`.
 */

export type PlanetKey = 'merkur' | 'venuse' | 'zeme' | 'mars' | 'jupiter' | 'saturn' | 'uran' | 'neptun';

export interface SpacePlanet {
  id: PlanetKey;
  name: string;
  /** Poloměr v km. */
  r: number;
  /** Vzdálenost od Slunce v astronomických jednotkách. */
  au: number;
  /** Oběžná doba v letech. */
  period: number;
  type: 'kamenná' | 'plynná';
  orbitText: string;
  /** Kartička z přílohy lekce Schovaná v Mléčné dráze (Mars opraven na kamennou planetu). */
  text: string;
  order: number;
  /** Poloměr v poloměrech Země. */
  re: number;
  phase0: number;
}

const RAW: Array<Omit<SpacePlanet, 'order' | 're' | 'phase0'>> = [
  { id: 'merkur', name: 'Merkur', r: 2440, au: 0.39, period: 0.241, type: 'kamenná', orbitText: '88 dní', text: 'Kamenná planeta nejblíže Slunci. Zvrásněný pustý svět, kde v noci prudce mrzne a ve dne Slunce strašlivě pálí. Nejmenší ze všech planet.' },
  { id: 'venuse', name: 'Venuše', r: 6052, au: 0.72, period: 0.615, type: 'kamenná', orbitText: '225 dní', text: 'Kamenná planeta zahalená hustými oblaky, ze kterých prší kyselina sírová. Je blízko Zemi a je podobně veliká.' },
  { id: 'zeme', name: 'Země', r: 6371, au: 1.0, period: 1.0, type: 'kamenná', orbitText: '1 rok (365 dní)', text: 'Jediná planeta v celém vesmíru, o které víme, že na ní existuje život. Je tak akorát daleko od Slunce, aby na ní nebyla strašná zima ani děsné horko. Největší z kamenných planet.' },
  { id: 'mars', name: 'Mars', r: 3390, au: 1.52, period: 1.881, type: 'kamenná', orbitText: 'skoro 2 roky', text: 'Rudá pouštní planeta, kde zuří silné prachové bouře. Lidé ji spojovali s mimozemským životem, ten se ale neprokázal.' },
  { id: 'jupiter', name: 'Jupiter', r: 69911, au: 5.2, period: 11.86, type: 'plynná', orbitText: '12 let', text: 'Král planet. Obrovská plynná planeta, na které běsní největší bouře ve Sluneční soustavě – je to ta červená skvrna.' },
  { id: 'saturn', name: 'Saturn', r: 58232, au: 9.58, period: 29.46, type: 'plynná', orbitText: '29 a půl roku', text: 'Plynný obr s prstenci, které jsou tvořené drobným kamením a ledem. Druhá největší planeta.' },
  { id: 'uran', name: 'Uran', r: 25362, au: 19.2, period: 84.0, type: 'plynná', orbitText: '84 let', text: 'Zelenomodrá plynná planeta, která se jako jediná kutálí – leží na boku. Má 13 prstenců, které jsou špatně vidět.' },
  { id: 'neptun', name: 'Neptun', r: 24622, au: 30.05, period: 164.8, type: 'plynná', orbitText: '165 let', text: 'Obří modravý mrazivý svět s bělavými obláčky. Poslední planeta od Slunce.' },
];
const PHASE0 = [4.4, 3.2, 1.75, 5.3, 0.6, 2.4, 5.9, 4.7];
export const SPACE_PLANETS: SpacePlanet[] = RAW.map((p, i) => ({ ...p, order: i + 1, re: p.r / 6371, phase0: PHASE0[i] }));

export const OTHER_BODIES: Record<'slunce' | 'mesic' | 'kometa', { name: string; text: string }> = {
  slunce: { name: 'Slunce', text: 'Hvězda uprostřed Sluneční soustavy. Vydává světlo a teplo a je zdrojem energie pro celou Sluneční soustavu. Obíhá kolem něj osm planet.' },
  mesic: { name: 'Měsíc', text: 'Obíhá kolem Země, jednou za necelý měsíc. Sám nesvítí – vidíme ho, protože na něj svítí Slunce.' },
  kometa: { name: 'Kometa', text: 'Těleso z ledu a prachu. Když se přiblíží ke Slunci, začne tát a vytvoří se jí ohon. Ohon míří vždy od Slunce.' },
};

/* ------------------------------------------------------------ pomocníci */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Přizpůsobí rozlišení canvasu jeho velikosti na stránce; vrací rozměry v CSS pixelech. */
export function fitCanvas(cv: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  return { w: rect.width, h: rect.height, dpr };
}

function blob(ctx: CanvasRenderingContext2D, rnd: () => number, cx: number, cy: number, rad: number, pts = 11) {
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = rad * (0.6 + rnd() * 0.65);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * 0.8;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function bands(ctx: CanvasRenderingContext2D, S: number, rnd: () => number, colors: string[], wav = 0.03) {
  let y = 0;
  let i = 0;
  while (y < S) {
    const h = S * (0.04 + rnd() * 0.09);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= S; x += S / 24) ctx.lineTo(x, y + Math.sin((x / S) * 9 + i) * S * wav * rnd());
    ctx.lineTo(S, y + h + 2);
    for (let x = S; x >= 0; x -= S / 24) ctx.lineTo(x, y + h + 2 + Math.sin((x / S) * 7 + i * 2) * S * wav * rnd());
    ctx.closePath();
    ctx.fill();
    y += h;
    i++;
  }
}

/* ------------------------------------------------------------ planety */

const texCache = new Map<string, HTMLCanvasElement>();

function planetTexture(id: PlanetKey, S: number): HTMLCanvasElement {
  const key = id + S;
  const cached = texCache.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const rnd = rng(id.length * 977 + S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.clip();
  const fill = (col: string | CanvasGradient) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, S, S);
  };
  if (id === 'merkur') {
    fill('#9b9792');
    for (let i = 0; i < 60; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(70,66,62,.35)' : 'rgba(200,196,190,.3)'; blob(ctx, rnd, rnd() * S, rnd() * S, S * (0.02 + rnd() * 0.08), 8); }
    for (let i = 0; i < 26; i++) { const x = rnd() * S, y = rnd() * S, r = S * (0.015 + rnd() * 0.05); ctx.strokeStyle = 'rgba(60,56,52,.45)'; ctx.lineWidth = Math.max(1, S * 0.008); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
  } else if (id === 'venuse') {
    fill('#e9cf98');
    bands(ctx, S, rnd, ['#f1dcae', '#e2c287', '#efd6a2', '#d9b77a'], 0.06);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,245,220,.18)'; blob(ctx, rnd, rnd() * S, rnd() * S, S * (0.08 + rnd() * 0.15)); }
  } else if (id === 'zeme') {
    const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#2f6fca'); g.addColorStop(0.5, '#1f5bb6'); g.addColorStop(1, '#2f6fca'); fill(g);
    const land: Array<[number, number, number, string]> = [[0.28, 0.32, 0.2, '#3f8a3c'], [0.36, 0.62, 0.16, '#4c8f3d'], [0.66, 0.3, 0.17, '#7d8a45'], [0.72, 0.55, 0.13, '#b49a5d'], [0.58, 0.78, 0.1, '#4f8e42'], [0.18, 0.7, 0.08, '#3d7f39']];
    for (const [x, y, r, col] of land) { ctx.fillStyle = col; blob(ctx, rnd, x * S, y * S, r * S, 13); ctx.fillStyle = 'rgba(40,110,45,.6)'; blob(ctx, rnd, x * S + r * S * 0.2, y * S, r * S * 0.5, 9); }
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath(); ctx.ellipse(S / 2, S * 0.02, S * 0.38, S * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(S / 2, S * 0.98, S * 0.42, S * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 22; i++) { ctx.fillStyle = 'rgba(255,255,255,.55)'; const y = rnd() * S, x = rnd() * S; ctx.beginPath(); ctx.ellipse(x, y, S * (0.06 + rnd() * 0.16), S * (0.012 + rnd() * 0.025), (rnd() - 0.5) * 0.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'mars') {
    fill('#c0532a');
    for (let i = 0; i < 40; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(120,40,20,.35)' : 'rgba(230,140,90,.25)'; blob(ctx, rnd, rnd() * S, rnd() * S, S * (0.04 + rnd() * 0.12)); }
    ctx.fillStyle = 'rgba(90,30,20,.4)'; ctx.beginPath(); ctx.ellipse(S * 0.5, S * 0.52, S * 0.3, S * 0.035, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fbf6f0'; ctx.beginPath(); ctx.ellipse(S / 2, S * 0.03, S * 0.25, S * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'jupiter') {
    bands(ctx, S, rnd, ['#e9dcc4', '#c49a6c', '#f2e8d6', '#a8744c', '#e3cfae', '#b98a5e', '#efe2c9'], 0.025);
    ctx.fillStyle = '#c4573a'; ctx.beginPath(); ctx.ellipse(S * 0.64, S * 0.64, S * 0.12, S * 0.065, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,200,.45)'; ctx.beginPath(); ctx.ellipse(S * 0.64, S * 0.64, S * 0.07, S * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'saturn') {
    bands(ctx, S, rnd, ['#eadbb0', '#d8c08a', '#f0e3bf', '#cdb07a', '#e6d3a2'], 0.015);
  } else if (id === 'uran') {
    const g = ctx.createLinearGradient(0, 0, S, 0); g.addColorStop(0, '#a9e6ea'); g.addColorStop(1, '#8fd3dc'); fill(g);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(S * (0.1 + i * 0.15), 0, S * 0.05, S); }
  } else {
    bands(ctx, S, rnd, ['#3d62d4', '#3557c6', '#4a6fe0', '#2f4fba'], 0.02);
    ctx.fillStyle = '#1e3488'; ctx.beginPath(); ctx.ellipse(S * 0.4, S * 0.42, S * 0.1, S * 0.055, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(rnd() * S, S * (0.25 + rnd() * 0.5), S * (0.04 + rnd() * 0.08), S * 0.012, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  texCache.set(key, c);
  return c;
}

/** Stín na straně odvrácené od světla; `la` je úhel od planety ke zdroji světla. */
function shade(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, la: number, strength = 0.92) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const lx = Math.cos(la), ly = Math.sin(la);
  const g = ctx.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
  g.addColorStop(0, 'rgba(2,4,14,0)'); g.addColorStop(0.42, 'rgba(2,4,14,0.04)'); g.addColorStop(0.6, `rgba(2,4,14,${strength * 0.75})`); g.addColorStop(1, `rgba(2,4,14,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  const g2 = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
  g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = g2;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function drawRings(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tilt: number, half: 'back' | 'front', kind: PlanetKey) {
  ctx.save();
  if (kind === 'uran') { ctx.translate(x, y); ctx.rotate(1.35); ctx.translate(-x, -y); }
  const rings: Array<[number, number, string]> = kind === 'saturn'
    ? [[1.24, 1.42, 'rgba(190,170,130,.55)'], [1.45, 1.86, 'rgba(226,206,160,.9)'], [1.86, 1.93, 'rgba(40,30,20,.25)'], [1.93, 2.2, 'rgba(205,185,140,.75)']]
    : [[1.6, 1.68, 'rgba(200,240,245,.35)'], [1.8, 1.84, 'rgba(200,240,245,.25)']];
  const k = Math.max(0.12, tilt);
  for (const [a, b, col] of rings) {
    ctx.strokeStyle = col;
    ctx.lineWidth = (b - a) * r;
    const rr = ((a + b) / 2) * r;
    ctx.beginPath();
    if (half === 'back') ctx.ellipse(x, y, rr, rr * k, 0, Math.PI, Math.PI * 2);
    else ctx.ellipse(x, y, rr, rr * k, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlanet(ctx: CanvasRenderingContext2D, p: SpacePlanet, x: number, y: number, r: number, la: number, tilt = 0.35) {
  if (p.id === 'saturn' || p.id === 'uran') drawRings(ctx, x, y, r, tilt, 'back', p.id);
  const S = Math.max(16, Math.min(256, Math.ceil(r * 4) & ~7));
  ctx.drawImage(planetTexture(p.id, S), x - r, y - r, r * 2, r * 2);
  shade(ctx, x, y, r, la);
  if (p.id === 'zeme' || p.id === 'venuse' || p.id === 'neptun' || p.id === 'uran') {
    ctx.save();
    ctx.strokeStyle = p.id === 'venuse' ? 'rgba(255,230,180,.25)' : 'rgba(140,190,255,.35)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, r * 1.02, la - 1.2, la + 1.2);
    ctx.stroke();
    ctx.restore();
  }
  if (p.id === 'saturn' || p.id === 'uran') drawRings(ctx, x, y, r, tilt, 'front', p.id);
}

export function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
  glow.addColorStop(0, 'rgba(255,190,70,.55)'); glow.addColorStop(0.35, 'rgba(255,140,30,.16)'); glow.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
  g.addColorStop(0, '#fffbe8'); g.addColorStop(0.45, '#ffe066'); g.addColorStop(0.85, '#ffab2e'); g.addColorStop(1, '#ff8a1f');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  const rnd = rng(7);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * 6.283, d = rnd() * r;
    ctx.fillStyle = 'rgba(255,150,30,.18)';
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.05 + rnd() * 0.08), 0, 6.283); ctx.fill();
  }
  ctx.restore();
}

const STARS = (() => { const r = rng(42); return Array.from({ length: 320 }, () => ({ x: r(), y: r(), s: r() * 1.3 + 0.2, a: 0.3 + r() * 0.7, tw: r() * 6.28 })); })();

export function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, still: boolean) {
  for (const s of STARS) {
    ctx.globalAlpha = s.a * (still ? 1 : 0.75 + 0.25 * Math.sin(t * 1.3 + s.tw));
    ctx.fillStyle = '#fff';
    ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
  }
  ctx.globalAlpha = 1;
}

export function label(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, col: string, size = 14) {
  ctx.font = `700 ${size}px VisbyRound, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(6,10,28,.85)';
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = col;
  ctx.fillText(txt, x, y);
}

/* ------------------------------------------------------------ Měsíc */

export const SYNODIC = 29.530588853;

export interface MoonPhaseInfo { name: string; at: number; book: boolean; note: string }

export const MOON_PHASE_INFO: MoonPhaseInfo[] = [
  { name: 'Nov', at: 0, book: true, note: 'Měsíc je mezi Zemí a Sluncem. Osvětlená strana míří od nás, takže ho nevidíme.' },
  { name: 'Dorůstající srpek', at: 3.69, book: true, note: 'Svítí pravý okraj. S čárou vlevo by vypadal jako písmeno D – dorůstá.' },
  { name: 'První čtvrť', at: 7.38, book: true, note: 'Vidíme pravou polovinu. Měsíc urazil čtvrtinu oběhu kolem Země.' },
  { name: 'Dorůstající Měsíc', at: 11.07, book: false, note: 'Osvětlené je víc než půlka a každý den přibývá.' },
  { name: 'Úplněk', at: 14.77, book: true, note: 'Měsíc je za Zemí, na druhé straně než Slunce. Vidíme celou osvětlenou polovinu.' },
  { name: 'Couvající Měsíc', at: 18.46, book: false, note: 'Osvětlené je víc než půlka, ale každý den ubývá.' },
  { name: 'Poslední čtvrť', at: 22.15, book: true, note: 'Vidíme levou polovinu.' },
  { name: 'Couvající srpek', at: 25.84, book: true, note: 'Svítí levý okraj. Vypadá jako písmeno C – couvá.' },
];

export function phaseIndex(day: number) {
  const d = ((day % SYNODIC) + SYNODIC) % SYNODIC;
  let best = 0, bd = 99;
  MOON_PHASE_INFO.forEach((p, i) => {
    let dd = Math.abs(d - p.at);
    dd = Math.min(dd, SYNODIC - dd);
    if (dd < bd) { bd = dd; best = i; }
  });
  return best;
}

/** Den od novu pro dnešní datum (referenční nov 6. 1. 2000 18:14 UTC). */
export function todayMoonDay(now = Date.now()) {
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  return ((((now - ref) / 86400000) % SYNODIC) + SYNODIC) % SYNODIC;
}

let moonTex: HTMLCanvasElement | null = null;
function moonTexture(): HTMLCanvasElement {
  if (moonTex) return moonTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const rnd = rng(11);
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, 6.283); ctx.clip();
  const g = ctx.createRadialGradient(S * 0.45, S * 0.42, S * 0.1, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#e7e4dc'); g.addColorStop(1, '#bdb9b0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const maria: Array<[number, number, number]> = [[0.36, 0.3, 0.16], [0.52, 0.36, 0.12], [0.62, 0.28, 0.1], [0.42, 0.52, 0.14], [0.3, 0.58, 0.09], [0.58, 0.55, 0.08], [0.68, 0.45, 0.07]];
  for (const [x, y, r] of maria) { ctx.fillStyle = 'rgba(120,118,112,.55)'; blob(ctx, rnd, x * S, y * S, r * S, 12); }
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S, y = rnd() * S, r = S * (0.006 + rnd() * 0.025);
    ctx.strokeStyle = 'rgba(90,88,84,.35)'; ctx.lineWidth = Math.max(1, S * 0.004);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, 6.283); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(S * 0.44, S * 0.84, S * 0.03, 0, 6.283); ctx.fill();
  moonTex = c;
  return c;
}

/** Osvětlená část Měsíce při fázovém úhlu `a` (0 = nov); dorůstající svítí vpravo (severní polokoule). */
function litPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  const waxing = a <= Math.PI;
  const c = Math.cos(a);
  const N = 48;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const yy = -r + (2 * r * i) / N;
    const s = Math.sqrt(Math.max(0, 1 - (yy / r) ** 2));
    const xx = waxing ? r * s : -r * s;
    if (i) ctx.lineTo(x + xx, y + yy);
    else ctx.moveTo(x + xx, y + yy);
  }
  for (let i = N; i >= 0; i--) {
    const yy = -r + (2 * r * i) / N;
    const s = Math.sqrt(Math.max(0, 1 - (yy / r) ** 2));
    ctx.lineTo(x + (waxing ? r * c * s : -r * c * s), y + yy);
  }
  ctx.closePath();
}

export function drawMoonPhase(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, day: number) {
  const a = ((((day % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC) * Math.PI * 2;
  const tex = moonTexture();
  ctx.save(); ctx.globalAlpha = 0.13; ctx.drawImage(tex, x - r, y - r, r * 2, r * 2); ctx.restore();
  ctx.save();
  litPath(ctx, x, y, r, a);
  ctx.clip();
  ctx.drawImage(tex, x - r, y - r, r * 2, r * 2);
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

export type Eclipse = 'slunce' | 'mesic' | null;

/** Pohled shora: Slunce svítí zleva, Měsíc obíhá kolem Země proti směru hodinových ručiček. */
/** Dole přes pohled leží ovládací lišta – dráha i popisky musí zůstat nad ní. */
const ORBIT_TOOLBAR = 92;

/** Rozložení pohledu shora (stejné pro kreslení i pro tažení Měsíce). */
function orbitLayout(w: number, h: number) {
  const hh = Math.max(200, h - ORBIT_TOOLBAR);
  return { cx: w * 0.56, cy: hh * 0.53, R: Math.min(w * 0.3, hh * 0.36) };
}

export function drawMoonOrbit(cv: HTMLCanvasElement, day: number, t: number, still: boolean, eclipse: Eclipse = null) {
  const { w, h, dpr } = fitCanvas(cv);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#060a1c'; ctx.fillRect(0, 0, w, h);
  drawStars(ctx, w, h, t, still);
  const fs = Math.round(Math.max(13, Math.min(w, h) / 34));
  const sg = ctx.createLinearGradient(0, 0, w * 0.35, 0);
  sg.addColorStop(0, 'rgba(255,200,90,.35)'); sg.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, w * 0.35, h);
  ctx.strokeStyle = 'rgba(255,210,120,.35)'; ctx.lineWidth = 2;
  for (let i = 1; i <= 5; i++) { const y = (h * i) / 6; ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(48, y); ctx.lineTo(42, y - 5); ctx.moveTo(48, y); ctx.lineTo(42, y + 5); ctx.stroke(); }
  label(ctx, 'světlo ze Slunce', 80, h / 6 - 12, '#ffd98a', fs - 1);
  const { cx, cy, R } = orbitLayout(w, h);
  const er = Math.max(16, R * 0.2);
  ctx.strokeStyle = 'rgba(160,180,255,.3)'; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  drawPlanet(ctx, SPACE_PLANETS[2], cx, cy, er, Math.PI);
  label(ctx, 'Země', cx, cy + er + fs + 2, '#dfe6ff', fs);
  const a = (day / SYNODIC) * Math.PI * 2;
  const mx = cx - R * Math.cos(a), my = cy + R * Math.sin(a);
  const mr = Math.max(9, er * 0.45);
  if (eclipse === 'slunce') {
    // Zatmění Slunce: Měsíc stojí přesně mezi Sluncem a Zemí a jeho stín dopadne na Zemi.
    const g2 = ctx.createLinearGradient(mx, 0, cx - er, 0);
    g2.addColorStop(0, 'rgba(0,0,0,.75)'); g2.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(mx, my - mr); ctx.lineTo(cx - er * 0.97, cy - er * 0.18); ctx.lineTo(cx - er * 0.97, cy + er * 0.18); ctx.lineTo(mx, my + mr); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, er, 0, 6.283); ctx.clip();
    const spot = ctx.createRadialGradient(cx - er, cy, 0, cx - er, cy, er * 0.45);
    spot.addColorStop(0, 'rgba(0,0,0,.85)'); spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot; ctx.fillRect(cx - er, cy - er, er, er * 2);
    ctx.restore();
    label(ctx, 'stín Měsíce', (mx + cx - er) / 2, cy - er * 0.9, '#c9d2f0', fs - 1);
  } else if (eclipse === 'mesic') {
    // Zatmění Měsíce: Země stojí přesně mezi Sluncem a Měsícem a Měsíc zajde do jejího stínu.
    const end = cx + R + mr * 4;
    const g2 = ctx.createLinearGradient(cx, 0, end, 0);
    g2.addColorStop(0, 'rgba(0,0,0,.7)'); g2.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.moveTo(cx, cy - er); ctx.lineTo(end, cy - er * 0.75); ctx.lineTo(end, cy + er * 0.75); ctx.lineTo(cx, cy + er); ctx.closePath(); ctx.fill();
    drawPlanet(ctx, SPACE_PLANETS[2], cx, cy, er, Math.PI);
    label(ctx, 'stín Země', (cx + er + mx - mr) / 2, cy - er * 0.95, '#c9d2f0', fs - 1);
  }
  ctx.strokeStyle = 'rgba(240,161,44,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mx, my); ctx.stroke(); ctx.setLineDash([]);
  ctx.save();
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.clip();
  ctx.drawImage(moonTexture(), mx - mr, my - mr, mr * 2, mr * 2);
  ctx.fillStyle = 'rgba(2,4,14,.88)'; ctx.fillRect(mx, my - mr, mr, mr * 2);
  // Ve stínu Země Měsíc zčervená.
  if (eclipse === 'mesic') { ctx.fillStyle = 'rgba(150,45,20,.72)'; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2); }
  ctx.restore();
  // Půlka Měsíce otočená k Zemi = to, co ze Země vidíme. Podbarvená modře, stejně jako kroužek
  // kolem Měsíce v okně „Takhle ho vidíme ze Země“ – stejná barva říká „tohle je totéž“.
  const toEarth = Math.atan2(cy - my, cx - mx);
  ctx.save();
  ctx.fillStyle = 'rgba(127,211,255,.38)';
  ctx.beginPath(); ctx.arc(mx, my, mr, toEarth - Math.PI / 2, toEarth + Math.PI / 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#7fd3ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(mx, my, mr + 4, toEarth - Math.PI / 2, toEarth + Math.PI / 2); ctx.stroke();
  ctx.restore();
  label(ctx, 'Měsíc', mx, my - mr - 10, '#e8e6e0', fs);
  MOON_PHASE_INFO.forEach((p) => {
    const pa = (p.at / SYNODIC) * Math.PI * 2;
    ctx.fillStyle = p.book ? 'rgba(240,161,44,.55)' : 'rgba(160,180,255,.35)';
    ctx.beginPath(); ctx.arc(cx - R * Math.cos(pa), cy + R * Math.sin(pa), 3, 0, 6.283); ctx.fill();
  });
  label(ctx, eclipse === 'slunce' ? 'Zatmění Slunce – Měsíc je přesně mezi Sluncem a Zemí' : eclipse === 'mesic' ? 'Zatmění Měsíce – Země je přesně mezi Sluncem a Měsícem' : 'Měsíc oběhne Zemi asi za 29 a půl dne', cx, Math.max(200, h - ORBIT_TOOLBAR) - 6, eclipse ? '#ffd98a' : '#9aa6d1', fs - 2);
}

/**
 * Tažení Měsíce v pohledu shora: ze souřadnic myši/prstu spočítá den oběhu (stejná geometrie
 * jako drawMoonOrbit) a řekne, jestli uživatel chytil Měsíc nebo aspoň jeho dráhu.
 */
export function moonOrbitPointer(cv: HTMLCanvasElement, clientX: number, clientY: number, day: number) {
  const rect = cv.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  const px = clientX - rect.left, py = clientY - rect.top;
  const { cx, cy, R } = orbitLayout(w, h);
  const er = Math.max(16, R * 0.2);
  const mr = Math.max(9, er * 0.45);
  const a = (day / SYNODIC) * Math.PI * 2;
  const mx = cx - R * Math.cos(a), my = cy + R * Math.sin(a);
  const onMoon = Math.hypot(px - mx, py - my) <= mr + 18;
  const onOrbit = Math.abs(Math.hypot(px - cx, py - cy) - R) <= 22;
  let angle = Math.atan2(py - cy, cx - px);
  if (angle < 0) angle += Math.PI * 2;
  return { day: (angle / (Math.PI * 2)) * SYNODIC, onMoon, onOrbit };
}

/** Jak Měsíc vidíme ze Země, s nápovědou D (dorůstá) / C (couvá). */
export function drawMoonSky(cv: HTMLCanvasElement, day: number, hintDC: boolean, t: number, still: boolean, eclipse: Eclipse = null) {
  const { w, h, dpr } = fitCanvas(cv);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#060a1c'); g.addColorStop(1, '#14204a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  drawStars(ctx, w, h * 0.8, t, still);
  const r = Math.min(w, h) * 0.3;
  const x = w / 2, y = h * 0.47;
  const fromNew = ((day % SYNODIC) + SYNODIC) % SYNODIC;
  const isNew = Math.min(fromNew, SYNODIC - fromNew) < 1.2;
  if (eclipse === 'slunce') {
    // Slunce zakryté Měsícem: černý kotouč a kolem něj bílá záře (koróna).
    const corona = ctx.createRadialGradient(x, y, r * 0.95, x, y, r * 1.9);
    corona.addColorStop(0, 'rgba(255,255,255,.95)'); corona.addColorStop(0.25, 'rgba(220,235,255,.45)'); corona.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = corona; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#05070f'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  } else if (eclipse === 'mesic') {
    // Měsíc ve stínu Země: vidíme ho, ale je tmavě červený.
    drawMoonPhase(ctx, x, y, r, SYNODIC / 2);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#b5482a'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  } else if (isNew) {
    // Při novu Měsíc nevidíme – jen přerušovaný obrys, ať nevypadá jako slabý úplněk.
    ctx.save();
    ctx.strokeStyle = 'rgba(127,211,255,.75)'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
    ctx.restore();
    label(ctx, 'Měsíc teď nevidíme', x, y + 6, '#c9d2f0', Math.round(Math.max(14, r / 7)));
  } else {
    drawMoonPhase(ctx, x, y, r, day);
    ctx.save();
    ctx.strokeStyle = 'rgba(127,211,255,.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#0a1128';
  ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.9);
  for (let i = 0; i <= 12; i++) ctx.lineTo((w * i) / 12, h * (0.88 + 0.03 * Math.sin(i * 1.7)));
  ctx.lineTo(w, h); ctx.fill();
  const idx = phaseIndex(day);
  if (!eclipse && hintDC && (idx === 1 || idx === 2 || idx === 6 || idx === 7)) {
    const waxing = idx <= 2;
    ctx.save();
    ctx.font = `700 ${Math.round(r * 2.1)}px VisbyRound, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(240,161,44,.75)'; ctx.lineWidth = 2;
    ctx.strokeText(waxing ? 'D' : 'C', x + (waxing ? r * 0.1 : 0), y + r * 0.06);
    ctx.restore();
    label(ctx, waxing ? 'D jako dorůstá' : 'C jako couvá', x, y + r + 30, '#ffcf7a', Math.round(Math.max(15, r / 6)));
  }
}

/** Malý obrázek fáze pro lištu pod modelem. */
export function moonThumb(day: number, size = 48): string {
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0b1230';
  ctx.beginPath(); ctx.arc(size, size, size, 0, 6.283); ctx.fill();
  drawMoonPhase(ctx, size, size, size * 0.8, day);
  return c.toDataURL();
}
