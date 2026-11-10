import React, { useEffect, useRef, useState } from 'react';
import { drawStars, drawSun, fitCanvas, label } from './space-engine';

/**
 * Proč máme roční období? (Model Sluneční soustavy → Země → Vyzkoušej si)
 * Jednoduše pro 3. třídu: to, co děti samy vidí – naše krajina, jak vysoko je Slunce v poledne
 * a jak dlouhý je den. Nakloněnou osu Země (látka vyšších ročníků) záměrně neukazuje.
 * Celoplošná scéna jako ostatní animace; text dole přes scénu. Hodnoty přibližně pro Česko.
 */

type Season = 'jaro' | 'leto' | 'podzim' | 'zima';
const ORDER: Season[] = ['jaro', 'leto', 'podzim', 'zima'];
const NAME: Record<Season, string> = { jaro: 'Jaro', leto: 'Léto', podzim: 'Podzim', zima: 'Zima' };
const ICON: Record<Season, string> = { jaro: '🌱', leto: '☀️', podzim: '🍂', zima: '❄️' };
/** výška Slunce v poledne (0–1) a délka dne v hodinách */
const SUN: Record<Season, { high: number; day: number; word: string }> = {
  leto: { high: 0.9, day: 16, word: 'vysoko' },
  jaro: { high: 0.58, day: 12, word: 'napůl' },
  podzim: { high: 0.58, day: 12, word: 'napůl' },
  zima: { high: 0.26, day: 8, word: 'nízko' },
};
const TEXT: Record<Season, string> = {
  leto: 'V létě je Slunce v poledne vysoko a den je dlouhý. Proto je teplo.',
  zima: 'V zimě je Slunce i v poledne nízko a den je krátký. Proto je zima.',
  jaro: 'Na jaře jsou den a noc skoro stejně dlouhé. Slunce je každý den o kousek výš.',
  podzim: 'Na podzim jsou den a noc skoro stejně dlouhé. Slunce je každý den o kousek níž.',
};
/** Barvy krajiny: obloha nahoře / u obzoru, vzdálené kopce, blízké kopce, koruny stromů */
const LOOK: Record<Season, { sky: [string, string]; far: string; near: string; crown: string | null; dots?: string }> = {
  jaro: { sky: ['#4f93e0', '#cfe6ff'], far: '#8cc77a', near: '#5fae4f', crown: '#7cc95a', dots: '#ffd6e4' },
  leto: { sky: ['#2f7fdc', '#a6d8ff'], far: '#5aa24e', near: '#3f8f3c', crown: '#2f8040' },
  podzim: { sky: ['#6f8fc9', '#f3d9b0'], far: '#b5a04a', near: '#8f8a3a', crown: '#e3892e', dots: '#c8501e' },
  zima: { sky: ['#7f97c6', '#e4ebf6'], far: '#dfe7f3', near: '#f4f7fc', crown: null },
};
const FONT = { fontFamily: 'VisbyRound, system-ui, sans-serif' };

export function Seasons({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Season>('leto');
  const sun = SUN[s];
  return (
    <div className="absolute inset-0 z-30 text-white overflow-hidden" style={{ background: '#0b1230' }}>
      <Scene season={s} />
      {/* nahoře: zpět + roční období */}
      <div className="absolute left-0 right-0 top-3 z-10 flex items-start gap-2 px-4 flex-wrap">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Zpět
        </button>
        <div className="flex gap-1.5 flex-wrap mx-auto">
          {ORDER.map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={s === x}
              onClick={() => setS(x)}
              className="h-9 px-3.5 rounded-full text-sm font-bold transition-colors shadow"
              style={{ background: s === x ? '#ffffff' : 'rgba(15,29,77,.55)', color: s === x ? '#0f1d4d' : '#fff' }}
            >
              {ICON[x]} {NAME[x]}
            </button>
          ))}
        </div>
      </div>
      {/* dole přes scénu: věta a délka dne */}
      <div className="absolute left-0 right-0 bottom-0 z-10 px-5 pb-5 pt-16 flex flex-col items-center gap-3 text-center" style={{ background: 'linear-gradient(to bottom, rgba(6,10,28,0), rgba(6,10,28,.82) 55%)' }}>
        <p key={s} className="text-lg md:text-2xl font-bold leading-snug max-w-2xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,.6)', animation: 'sezIn .5s ease' }}>{TEXT[s]}</p>
        <div className="w-full max-w-md">
          <div className="flex h-4 rounded-full overflow-hidden" aria-hidden="true">
            {Array.from({ length: 24 }, (_, h) => {
              const light = Math.abs(h + 0.5 - 12) < sun.day / 2;
              return <span key={h} className="flex-1 transition-colors duration-500" style={{ background: light ? '#ffd54a' : '#26306a', borderRight: h < 23 ? '1px solid rgba(6,10,28,.45)' : 'none' }} />;
            })}
          </div>
          <p className="text-sm font-bold mt-1.5 text-[#dfe5ff]">Den trvá asi {sun.day} hodin</p>
        </div>
      </div>
      <style>{'@keyframes sezIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'}</style>
    </div>
  );
}

/** Celoplošná scéna ve stylu „Takhle ho vidíme ze Země“: tmavomodrá obloha, Slunce, tmavé kopce. */
function Scene({ season }: { season: Season }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const cur = useRef(SUN[season].high);
  useEffect(() => {
    let raf = 0;
    const target = SUN[season].high;
    const frame = () => {
      cur.current += (target - cur.current) * 0.12; // Slunce plynule vyjede / sjede
      if (ref.current) drawScene(ref.current, season, cur.current);
      if (Math.abs(target - cur.current) > 0.001) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => ref.current && drawScene(ref.current, season, cur.current);
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [season]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-label={`Slunce v poledne je ${SUN[season].word}`} />;
}

function drawScene(cv: HTMLCanvasElement, season: Season, high: number) {
  const { w, h, dpr } = fitCanvas(cv);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#060a1c'); g.addColorStop(1, '#14204a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  drawStars(ctx, w, h * 0.7, 0, true);

  const gy = h * 0.72; // obzor
  const S = Math.min(w, h);
  const topY = 70 + S * 0.07 + 40; // pod tlačítky ročních období zbude místo na popisek
  const sx = w / 2, sy = gy - S * 0.06 - high * (gy - S * 0.06 - topY);
  const fs = Math.round(Math.max(14, S / 30));
  // cesta Slunce po obloze od rána do večera
  ctx.save();
  ctx.strokeStyle = 'rgba(255,214,130,.55)'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 10]); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(w * 0.06, gy); ctx.quadraticCurveTo(sx, 2 * sy - gy, w * 0.94, gy); ctx.stroke();
  ctx.restore();
  drawSun(ctx, sx, sy, S * 0.07);
  label(ctx, `v poledne ${SUN[season].word}`, sx, sy - S * 0.07 - 16, '#ffd98a', fs + 2);
  label(ctx, 'ráno', w * 0.07, gy - 14, '#c9d2f0', fs);
  label(ctx, 'večer', w * 0.93, gy - 14, '#c9d2f0', fs);

  // kopce (tmavá silueta jako u Měsíce), v zimě se sněhem
  const ridge = (x: number) => gy + h * 0.03 * Math.sin((x / w) * 12 * 1.7 / 2) - h * 0.01;
  ctx.fillStyle = '#0a1128';
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let i = 0; i <= 48; i++) { const x = (w * i) / 48; ctx.lineTo(x, ridge(x)); }
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  if (season === 'zima') {
    ctx.strokeStyle = 'rgba(230,238,255,.9)'; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = 0; i <= 48; i++) { const x = (w * i) / 48; i ? ctx.lineTo(x, ridge(x)) : ctx.moveTo(x, ridge(x)); }
    ctx.stroke();
  }
  // strom a domek jako siluety na obzoru
  const k = S / 520;
  const tx = w * 0.2, ty = ridge(w * 0.2) + 2;
  ctx.fillStyle = '#0a1128'; ctx.strokeStyle = '#2b3770'; ctx.lineCap = 'round';
  ctx.lineWidth = 10 * k; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - 70 * k); ctx.stroke();
  const leaf = season === 'leto' ? '#2f6b3a' : season === 'jaro' ? '#4f8f46' : season === 'podzim' ? '#b8662a' : null;
  if (leaf) {
    ctx.fillStyle = leaf;
    for (const [dx, dy, r] of [[0, -100, 40], [-28, -78, 28], [28, -78, 28]]) { ctx.beginPath(); ctx.arc(tx + dx * k, ty + dy * k, r * k, 0, 6.283); ctx.fill(); }
    if (season === 'jaro') { ctx.fillStyle = '#ffd6e4'; for (const [dx, dy] of [[-18, -104], [12, -118], [24, -84], [-6, -80], [6, -100]]) { ctx.beginPath(); ctx.arc(tx + dx * k, ty + dy * k, 4.5 * k, 0, 6.283); ctx.fill(); } }
  } else {
    ctx.lineWidth = 6 * k;
    for (const [x1, y1, x2, y2] of [[0, -50, -30, -96], [0, -60, 32, -104], [0, -70, 0, -118]]) { ctx.beginPath(); ctx.moveTo(tx + x1 * k, ty + y1 * k); ctx.lineTo(tx + x2 * k, ty + y2 * k); ctx.stroke(); }
  }
  const hx = w * 0.74, hy = ridge(w * 0.74) + 4;
  ctx.fillStyle = '#0a1128';
  ctx.fillRect(hx - 40 * k, hy - 54 * k, 80 * k, 56 * k);
  ctx.beginPath(); ctx.moveTo(hx - 52 * k, hy - 52 * k); ctx.lineTo(hx, hy - 96 * k); ctx.lineTo(hx + 52 * k, hy - 52 * k); ctx.closePath(); ctx.fill();
  if (season === 'zima') { ctx.strokeStyle = 'rgba(230,238,255,.9)'; ctx.lineWidth = 5 * k; ctx.beginPath(); ctx.moveTo(hx - 52 * k, hy - 52 * k); ctx.lineTo(hx, hy - 96 * k); ctx.lineTo(hx + 52 * k, hy - 52 * k); ctx.stroke(); }
  ctx.fillStyle = '#ffd98a'; ctx.fillRect(hx - 26 * k, hy - 38 * k, 16 * k, 14 * k); ctx.fillRect(hx + 10 * k, hy - 38 * k, 16 * k, 14 * k);
  // sníh / padající listí
  if (season === 'zima') { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (const [fx, fy, r] of FLAKES) { ctx.beginPath(); ctx.arc(fx * w, fy * h, r, 0, 6.283); ctx.fill(); } }
  if (season === 'podzim') { for (const [fx, fy, a] of LEAVES) { ctx.save(); ctx.translate(fx * w, fy * h); ctx.rotate(a); ctx.fillStyle = '#d0702a'; ctx.beginPath(); ctx.ellipse(0, 0, 6 * k + 2, 3 * k + 1, 0, 0, 6.283); ctx.fill(); ctx.restore(); } }
}

const FLAKES: Array<[number, number, number]> = [[0.09, 0.18, 3], [0.21, 0.42, 2], [0.33, 0.12, 3.5], [0.42, 0.5, 2], [0.61, 0.22, 3], [0.76, 0.45, 2], [0.86, 0.16, 3.5], [0.93, 0.55, 2], [0.15, 0.6, 2], [0.52, 0.08, 2.5], [0.69, 0.6, 2.5], [0.38, 0.3, 2]];
const LEAVES: Array<[number, number, number]> = [[0.26, 0.66, 0.5], [0.15, 0.7, -0.4], [0.3, 0.74, 1], [0.8, 0.68, -0.7]];
