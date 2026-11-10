import React, { useEffect, useRef, useState } from 'react';
import { SPACE_PLANETS, SYNODIC, drawMoonPhase, drawPlanet, drawSun } from './space-engine';

/**
 * Proč není zatmění každý měsíc (Model fází Měsíce → zatmění → „Ukaž mi to“).
 * Pohled z boku: Slunce vlevo, Země a za ní její stín. Dráha Měsíce je nakloněná (v animaci zvětšeně),
 * takže při úplňku Měsíc většinou proletí nad stínem nebo pod ním. Pátý měsíc se trefí – zatmění Měsíce.
 */

const ZEME = SPACE_PLANETS.find((p) => p.id === 'zeme')!;
const MONTH = 7; // sekund na jeden oběh (pomalu, ať se stihne přečíst popisek)
// Výška Měsíce nad / pod rovinou stínu při úplňku (−1 … 1) v jednotlivých měsících.
const OFFSETS = [0.9, 0.55, -0.6, -0.95, 0];
const CAPTIONS = [
  'Úplněk: Měsíc proletěl kousek nad stínem Země. Zatmění nebylo.',
  'Další úplněk: zase nad stínem. Zatmění nebylo.',
  'Teď prošel pod stínem. Zatmění zase nebylo.',
  'Pod stínem. Dráha Měsíce je totiž trochu nakloněná.',
  'Teď se trefil přesně do stínu Země – zatmění Měsíce!',
];
const INTRO = 'Měsíc obíhá kolem Země. Jeho dráha je trochu nakloněná (tady zvětšeně, ať je to vidět).';

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

export function EclipseWhy({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [t0] = useState(() => performance.now());
  const [cap, setCap] = useState(INTRO);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const total = MONTH * OFFSETS.length + 6;
      if (t > total + 4) { closeRef.current(); return; }
      const cv = ref.current;
      const info = cv ? draw(cv, Math.min(t, total)) : null;
      if (info) setCap((c) => (c === info ? c : info));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [t0]);

  return (
    <div className="absolute inset-0 z-30 text-white" style={{ background: '#04060f' }}>
      <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-label="Animace: proč není zatmění každý měsíc" />
      <div className="absolute left-4 top-3 z-10">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Zpět
        </button>
      </div>
      <p className="absolute left-0 right-0 bottom-8 z-10 px-6 text-center text-lg md:text-2xl font-bold leading-snug" style={{ textShadow: '0 2px 10px rgba(0,0,0,.8)' }}>{cap}</p>
    </div>
  );
}

function draw(cv: HTMLCanvasElement, t: number): string {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, w, h);

  // Na úzkém (telefonu) se scéna řídí šířkou, ať nejsou Země a Měsíc drobné uprostřed prázdna.
  const narrow = w < h;
  const cy = h * (narrow ? 0.44 : 0.45), ex = w * (narrow ? 0.52 : 0.42);
  const R = narrow ? w * 0.095 : Math.min(w, h) * 0.07;
  const orbitA = narrow ? w * 0.3 : w * 0.27, orbitB = narrow ? R * 0.9 : h * 0.07; // dráha Měsíce z boku (elipsa)
  const tiltPx = narrow ? R * 2.2 : h * 0.13; // zvětšený náklon dráhy

  // Slunce: kousek jeho okraje vlevo (jako v ostatních modelech) a pár jemných paprsků k Zemi.
  const fs = Math.round(Math.max(13, Math.min(w, h) / 34));
  const sunR = narrow ? w * 0.32 : Math.min(w, h) * 0.38;
  const sunX = -sunR * 0.72;
  ctx.strokeStyle = 'rgba(255,214,130,.18)'; ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) { const y = cy + i * R * 0.6; ctx.beginPath(); ctx.moveTo(sunX + sunR, y); ctx.lineTo(ex - R * 1.1, cy + i * R * 0.42); ctx.stroke(); }
  drawSun(ctx, sunX, cy, sunR);
  ctx.font = `700 ${fs - 1}px VisbyRound, system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffd98a';
  ctx.fillText('Slunce', 14, cy + sunR * 0.75 + fs + 6);
  // Stín Země doprava – světlý průhledný kužel s obrysem, ať je dobře vidět.
  ctx.fillStyle = 'rgba(127,170,255,.13)';
  ctx.beginPath(); ctx.moveTo(ex, cy - R); ctx.lineTo(w, cy - R * 0.55); ctx.lineTo(w, cy + R * 0.55); ctx.lineTo(ex, cy + R); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(127,211,255,.55)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ex, cy - R); ctx.lineTo(w, cy - R * 0.55); ctx.moveTo(ex, cy + R); ctx.lineTo(w, cy + R * 0.55); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = `700 ${Math.max(13, R * 0.3)}px VisbyRound, system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(127,211,255,.75)';
  ctx.textAlign = 'right'; ctx.fillText('stín Země', w - 12, cy - R * 0.75);

  // Který měsíc a kde v oběhu: úplněk (Měsíc vpravo za Zemí) je v půlce každého měsíce.
  const intro = 5;
  const tm = Math.max(0, t - intro);
  const m = Math.min(OFFSETS.length - 1, Math.floor(tm / MONTH));
  const f = t < intro ? 0.15 : Math.min(1, (tm - m * MONTH) / MONTH);
  const th = Math.PI + f * Math.PI * 2; // 0 = vpravo (úplněk)
  // Náklon: výška při úplňku plynule přejde z minulého měsíce na tenhle.
  const off = lerp(OFFSETS[Math.max(0, m - 1)], OFFSETS[m], m === 0 ? 1 : Math.min(1, f * 3));
  const tilt = (x: number) => off * tiltPx * x; // x = cos θ (−1 vlevo … 1 vpravo)

  // Dráha Měsíce (zadní půlka za Zemí, přední před ní)
  const orbitPt = (a: number) => ({ x: ex + Math.cos(a) * orbitA, y: cy - Math.sin(a) * orbitB - tilt(Math.cos(a)) });
  const path = (a0: number, a1: number) => { ctx.beginPath(); for (let k = 0; k <= 60; k++) { const p = orbitPt(a0 + (a1 - a0) * (k / 60)); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); };
  ctx.strokeStyle = 'rgba(240,161,44,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
  path(0, Math.PI);
  const mp = orbitPt(th);
  const behind = Math.sin(th) > 0;
  const moonR = R * 0.32;
  // Je Měsíc ve stínu? (vpravo za Zemí a ve výšce stínu)
  const shadowHalf = lerp(R, R * 0.55, (mp.x - ex) / (w - ex));
  const inShadow = mp.x > ex + R && Math.abs(mp.y - cy) < shadowHalf - moonR * 0.3;
  const drawMoon = () => {
    drawMoonPhase(ctx, mp.x, mp.y, moonR, SYNODIC / 2);
    if (inShadow) { ctx.fillStyle = 'rgba(170,50,25,.75)'; ctx.beginPath(); ctx.arc(mp.x, mp.y, moonR, 0, 6.283); ctx.fill(); }
  };
  if (behind) drawMoon();
  drawPlanet(ctx, ZEME, ex, cy, R, Math.PI);
  ctx.strokeStyle = 'rgba(240,161,44,.5)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
  path(Math.PI, Math.PI * 2);
  ctx.setLineDash([]);
  if (!behind) drawMoon();
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(231,236,255,.85)';
  ctx.fillText('Země', ex, cy + R + Math.max(18, R * 0.35));
  ctx.fillText('Měsíc', mp.x, mp.y - moonR - 8);
  // Počítadlo měsíců
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(154,166,209,.9)';
  if (t >= intro) ctx.fillText(`${m + 1}. měsíc`, w - 20, 34);

  if (t < intro) return INTRO;
  // Popisek se ukáže až po úplňku v daném měsíci
  return f > 0.55 ? CAPTIONS[m] : m === 0 ? 'Sleduj, kudy Měsíc proletí při úplňku – za Zemí, kde je její stín.' : CAPTIONS[m - 1];
}
