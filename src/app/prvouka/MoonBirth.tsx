import React, { useEffect, useRef, useState } from 'react';
import { SPACE_PLANETS, SYNODIC, drawMoonPhase, drawPlanet } from './space-engine';

// Stejné Země, Měsíc a planeta jako v ostatních modelech (textury ze space-engine).
const ZEME = SPACE_PLANETS.find((p) => p.id === 'zeme')!;
const MARS = SPACE_PLANETS.find((p) => p.id === 'mars')!;
const LIGHT = Math.PI * 1.08; // Slunce vlevo jako v pohledu shora

/**
 * Jak vznikl Měsíc (Model fází Měsíce → Vyzkoušej si).
 * Klidná, „snová“ animace bez výbuchu: mladá horká Země, pomalu připluje menší planeta, ťukne do ní,
 * kousky se rozletí do kroužku kolem Země a slepí se v Měsíc. Podáno jako „vědci si myslí“.
 */

export const BIRTH_STEPS: Array<{ at: number; text: string }> = [
  { at: 0, text: 'Před dávnými a dávnými lety byla Země mladá a horká.' },
  { at: 3, text: 'Vědci si myslí, že do ní tehdy narazila menší planeta.' },
  { at: 6, text: 'Kousky, které se rozletěly, začaly kroužit kolem Země.' },
  { at: 10, text: 'Pomalu se slepovaly k sobě…' },
  { at: 14, text: '…až z nich vznikl Měsíc. Země mezitím vychladla.' },
];
const END = 18;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
function mix(c1: number[], c2: number[], t: number) { return `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], t))).join(',')})`; }

const BITS = (() => { const r = rng(7); return Array.from({ length: 170 }, () => ({ ring: 1.7 + r() * 1.1, spread: (r() - 0.5) * 2.2, speed: 0.55 + r() * 0.5, size: 1 + r() * 2.2, join: 10 + r() * 3.6, warm: r() })); })();
const FAINT = (() => { const r = rng(3); return Array.from({ length: 140 }, () => ({ x: r(), y: r(), s: 0.5 + r(), a: 0.2 + r() * 0.5 })); })();

export function MoonBirth({ onClose, next }: { onClose: () => void; next?: { question: string; label: string; onClick: () => void } }) {
  // Po dohrání se chvíli ukáže hotový Měsíc a pak se vrátí pohled s fázemi Měsíce.
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [t0] = useState(() => performance.now());
  const [step, setStep] = useState(0);
  // Po dohrání nabídne navazující animaci (Země → Měsíc, Měsíc → Země) nebo návrat na fáze.
  const [done, setDone] = useState(false);
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const cv = ref.current;
      const raw = (now - t0) / 1000;
      if (raw > END + 1.5) setDone(true);
      const t = Math.min(END, raw);
      if (cv) draw(cv, t);
      const s = BIRTH_STEPS.reduce((acc, st, i) => (t >= st.at ? i : acc), 0);
      setStep((p) => (p === s ? p : s));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [t0]);

  return (
    <div className="absolute inset-0 z-30 text-white" style={{ background: '#04060f' }}>
      <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-label="Animace: jak vznikl Měsíc" />
      <div className="absolute left-4 top-3 z-10">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Zpět na fáze
        </button>
      </div>
      <div className="absolute left-0 right-0 bottom-6 z-10 flex flex-col items-center gap-3 px-6 text-center">
        <p key={step} className="text-lg md:text-2xl font-bold leading-snug max-w-2xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,.8)', animation: 'fadeIn .6s ease' }}>{BIRTH_STEPS[step].text}</p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {BIRTH_STEPS.map((_, i) => <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 22 : 8, background: i <= step ? '#f0a12c' : 'rgba(255,255,255,.3)' }} />)}
        </div>
      </div>
      {done ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6" style={{ background: 'rgba(4,6,15,.55)' }}>
          <div className="rounded-3xl bg-white text-[#0f1d4d] p-6 max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl">
            <p className="text-xl font-bold leading-snug">{next ? next.question : 'Hotovo!'}</p>
            {next ? (
              <button type="button" onClick={next.onClick} className="w-full h-12 rounded-full font-bold inline-flex items-center justify-center gap-2" style={{ background: '#f0a12c', color: '#2a1700', boxShadow: '0 3px 0 #b8741a' }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>
                {next.label}
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="w-full h-11 rounded-full bg-[#eef1f8] hover:bg-[#e2e7f3] font-bold text-[#4e5871]">Zpět na fáze Měsíce</button>
          </div>
        </div>
      ) : null}
      <style>{'@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'}</style>
    </div>
  );
}

function draw(cv: HTMLCanvasElement, t: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, w, h);
  for (const s of FAINT) { ctx.globalAlpha = s.a; ctx.fillStyle = '#fff'; ctx.fillRect(s.x * w, s.y * h, s.s, s.s); }
  ctx.globalAlpha = 1;

  const cx = w * 0.5, cy = h * 0.44, R = Math.min(w, h) * 0.12;
  const moonOrbit = R * 3.1;
  // Měsíc (a kousky) obíhají kolem Země proti směru hodinových ručiček.
  const orbitAngle = (tt: number) => -0.5 - tt * 0.35;

  // Malá planeta pomalu připlouvá zprava a „ťukne“ do Země v čase 3,6 s.
  const hitT = 3.6;
  const hitAngle = -0.35; // místo dotyku (vpravo nahoře)
  if (t < hitT + 0.5) {
    const k = ease(t / hitT);
    const tr = R * 0.5;
    const sx = lerp(w + tr * 2, cx + Math.cos(hitAngle) * (R + tr * 0.6), k);
    const sy = lerp(cy - R * 1.6, cy + Math.sin(hitAngle) * (R + tr * 0.6), k);
    ctx.globalAlpha = t < hitT ? 1 : 1 - (t - hitT) / 0.5;
    drawPlanet(ctx, MARS, sx, sy, tr, LIGHT);
    ctx.globalAlpha = 1;
  }

  // Země: z horké oranžové pomalu vychladne do modré.
  const cool = ease((t - 9) / 7);
  const glow = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.6);
  glow.addColorStop(0, `rgba(255,140,60,${0.35 * (1 - cool)})`); glow.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.6, 0, 6.283); ctx.fill();
  drawPlanet(ctx, ZEME, cx, cy, R, LIGHT);
  // Mladá Země je horká: přes skutečnou Zemi oranžová žhavá vrstva, která pomalu zmizí.
  if (cool < 1) {
    const hg = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R * 1.08);
    hg.addColorStop(0, `rgba(255,190,110,${0.95 * (1 - cool)})`);
    hg.addColorStop(0.6, `rgba(214,92,36,${0.95 * (1 - cool)})`);
    hg.addColorStop(1, `rgba(110,34,16,${0.95 * (1 - cool)})`);
    // o kousek větší než Země, ať zakryje i modrý obrys atmosféry (mladá horká Země ji ještě neměla)
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, cy, R * 1.08, 0, 6.283); ctx.fill();
  }

  // Jemné bliknutí při dotyku (žádný výbuch).
  if (t > hitT && t < hitT + 1.2) {
    const a = 1 - (t - hitT) / 1.2;
    const fx = cx + Math.cos(hitAngle) * R, fy = cy + Math.sin(hitAngle) * R;
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 1.1);
    fg.addColorStop(0, `rgba(255,235,200,${0.55 * a})`); fg.addColorStop(1, 'rgba(255,235,200,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fx, fy, R * 1.1, 0, 6.283); ctx.fill();
  }

  // Měsíc roste z kousků, které se k němu přidávají.
  const mAng = orbitAngle(t);
  const mx = cx + Math.cos(mAng) * moonOrbit, my = cy + Math.sin(mAng) * moonOrbit * 0.92;
  const joined = BITS.filter((b) => t > b.join + 1.2).length / BITS.length;
  const moonR = R * 0.27 * Math.sqrt(joined);

  // Kousky: rozletí se z místa dotyku, krouží v kroužku a pak se slepí do Měsíce.
  if (t > hitT) {
    for (const b of BITS) {
      if (t > b.join + 1.2) continue;
      const fx = cx + Math.cos(hitAngle) * R, fy = cy + Math.sin(hitAngle) * R;
      const ang = hitAngle + b.spread - (t - hitT) * b.speed * 0.55;
      const rx = cx + Math.cos(ang) * R * b.ring, ry = cy + Math.sin(ang) * R * b.ring * 0.92;
      const spreadK = ease((t - hitT) / 2.4);
      let x = lerp(fx, rx, spreadK), y = lerp(fy, ry, spreadK);
      if (t > b.join) { const k = ease((t - b.join) / 1.2); x = lerp(x, mx, k); y = lerp(y, my, k); }
      ctx.fillStyle = b.warm < 0.5 ? '#d9b48a' : '#a99c8e';
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(x, y, b.size, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (moonR > 0.5) drawMoonPhase(ctx, mx, my, moonR, SYNODIC / 2);
  // Popisky
  ctx.font = `700 ${Math.max(13, R * 0.2)}px VisbyRound, system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(231,236,255,.85)';
  ctx.fillText(cool > 0.5 ? 'Země' : 'mladá Země', cx, cy + R + Math.max(18, R * 0.3));
  if (t > 13 && moonR > 2) ctx.fillText('Měsíc', mx, my - moonR - 10);
}
