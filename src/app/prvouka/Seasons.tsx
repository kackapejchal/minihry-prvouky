import React, { useEffect, useRef, useState } from 'react';
import { SPACE_PLANETS, drawPlanet, drawSun } from './space-engine';

/**
 * Proč máme roční období? (Model Sluneční soustavy → Země → Vyzkoušej si)
 * Země obíhá kolem Slunce a její osa je pořád nakloněná stejným směrem. Když je naše polovina Země
 * nakloněná ke Slunci, je u nás léto: Slunce je v poledne vysoko a den je dlouhý. Vedle: výška Slunce
 * v poledne a délka dne u nás (Česko, přibližně). Vyvrací častý omyl, že v létě jsme blíž ke Slunci.
 */

const ZEME = SPACE_PLANETS.find((p) => p.id === 'zeme')!;
type Season = 'jaro' | 'leto' | 'podzim' | 'zima';
// Část roku: 0 = začátek jara (21. března), 0,25 = začátek léta, 0,5 = podzimu, 0,75 = zimy.
const AT: Record<Season, number> = { jaro: 0, leto: 0.25, podzim: 0.5, zima: 0.75 };
const NAME: Record<Season, string> = { jaro: 'Jaro', leto: 'Léto', podzim: 'Podzim', zima: 'Zima' };
const ICON: Record<Season, string> = { jaro: '🌱', leto: '☀️', podzim: '🍂', zima: '❄️' };
const TEXT: Record<Season, string> = {
  leto: 'V létě je naše polovina Země nakloněná ke Slunci. Slunce je v poledne vysoko, svítí víc zpříma a den je dlouhý – proto je teplo.',
  zima: 'V zimě je naše polovina Země odkloněná od Slunce. Slunce je i v poledne nízko, svítí šikmo a den je krátký – proto je zima.',
  jaro: 'Na jaře není naše polovina Země nakloněná ke Slunci ani od něj. Den a noc jsou skoro stejně dlouhé a pomalu se otepluje.',
  podzim: 'Na podzim není naše polovina Země nakloněná ke Slunci ani od něj. Den a noc jsou skoro stejně dlouhé a pomalu se ochlazuje.',
};
const YEAR_S = 24; // sekund na jeden oběh při přehrávání

const seasonOf = (f: number): Season => (['jaro', 'leto', 'podzim', 'zima'] as const)[Math.floor((((f % 1) + 1) % 1) * 4 + 0.0001) % 4];
/** −1 (zima) … 1 (léto) */
const lean = (f: number) => Math.sin(2 * Math.PI * f);

export function Seasons({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [f, setF] = useState(0.02);
  const fRef = useRef(f); fRef.current = f;
  const target = useRef<number | null>(null);
  const playRef = useRef(playing); playRef.current = playing;

  useEffect(() => {
    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      let v = fRef.current;
      if (target.current != null) {
        // plynule dojet na vybrané roční období (kratší cestou dopředu)
        let d = target.current - v; d = ((d % 1) + 1) % 1;
        const step = Math.min(d, dt * 0.6);
        v += step;
        if (d - step < 0.0005) { v = target.current; target.current = null; }
      } else if (playRef.current) v += dt / YEAR_S;
      v = ((v % 1) + 1) % 1;
      if (v !== fRef.current) { fRef.current = v; setF(v); }
      if (ref.current) draw(ref.current, v);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = seasonOf(f);
  const k = lean(f);
  const noon = Math.round(40 + 23.5 * k); // výška Slunce v poledne nad obzorem (°), Česko
  const day = Math.round(12 + 4.2 * k); // délka dne v hodinách, Česko

  return (
    <div className="absolute inset-0 z-30 text-white flex flex-col" style={{ background: '#04060f' }}>
      <div className="relative flex-1 min-h-[60%] sm:min-h-0">
        <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-label="Animace: Země obíhá kolem Slunce se skloněnou osou" />
        <div className="absolute left-4 top-3 z-10">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            Zpět
          </button>
        </div>
        {/* Roční období + přehrávání */}
        <div className="absolute left-0 right-0 bottom-3 z-10 flex flex-wrap justify-center gap-2 px-3">
          <button
            type="button"
            aria-label={playing ? 'Zastavit' : 'Přehrát'}
            onClick={() => { target.current = null; setPlaying((p) => !p); }}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
            style={{ background: '#f0a12c', color: '#2a1700' }}
          >
            {playing
              ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>}
          </button>
          {(['jaro', 'leto', 'podzim', 'zima'] as const).map((x) => (
            <button
              key={x}
              type="button"
              aria-pressed={s === x}
              onClick={() => { setPlaying(false); target.current = AT[x] + 0.06; }}
              className="h-8 sm:h-10 px-3 sm:px-4 rounded-full text-xs sm:text-sm font-bold transition-colors"
              style={{ background: s === x ? '#fde9c6' : 'rgba(255,255,255,.12)', color: s === x ? '#0f1d4d' : '#fff' }}
            >
              {ICON[x]} {NAME[x]}
            </button>
          ))}
        </div>
      </div>
      {/* U nás: výška Slunce v poledne a délka dne */}
      <div className="flex-shrink min-h-0 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3" style={{ background: '#0b1230' }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9aa6d1]">Teď je u nás</p>
          <p className="text-2xl font-bold leading-tight mb-2">{ICON[s]} {NAME[s]}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9aa6d1] mb-1">Slunce v poledne</p>
          <SunHeight deg={noon} />
          <p className="text-sm font-bold text-[#ffd98a] mt-1">{k > 0.5 ? 'vysoko' : k < -0.5 ? 'nízko' : 'napůl'}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9aa6d1] mb-1.5">Den trvá asi {day} hodin</p>
          <div className="flex h-5 rounded-full overflow-hidden" aria-hidden="true">
            {Array.from({ length: 24 }, (_, h) => {
              const light = Math.abs(h + 0.5 - 12) < day / 2;
              return <span key={h} className="flex-1" style={{ background: light ? '#f0c35a' : '#1c2550', borderRight: h < 23 ? '1px solid rgba(4,6,15,.35)' : 'none' }} />;
            })}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-[#9aa6d1] mt-1"><span>půlnoc</span><span>poledne</span><span>půlnoc</span></div>
          </div>
          <p className="col-span-2 sm:col-span-1 text-sm md:text-[15px] font-bold leading-snug">{TEXT[s]}</p>
          <p className="text-xs md:text-sm leading-snug text-[#9aa6d1]">Pozor: v zimě nejsme od Slunce dál. Za roční období může nakloněná osa Země.</p>
        </div>
      </div>
    </div>
  );
}

/** Malá krajinka: oblouk dráhy Slunce po obloze a Slunce v poledne. */
function SunHeight({ deg }: { deg: number }) {
  const W = 260, H = 96, gy = 82;
  const h = (deg / 90) * 76; // výška oblouku v px
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[240px] h-auto" aria-label={`Slunce v poledne asi ${deg}° nad obzorem`}>
      <path d={`M 20 ${gy} Q ${W / 2} ${gy - h * 2} ${W - 20} ${gy}`} fill="none" stroke="rgba(255,217,138,.45)" strokeWidth="2" strokeDasharray="4 5" />
      <circle cx={W / 2} cy={gy - h} r="11" fill="#ffcf4a" />
      <rect x="0" y={gy} width={W} height={H - gy} rx="3" fill="#2b4a2e" />
      <path d={`M 0 ${gy} L 40 ${gy - 8} L 70 ${gy - 2} L 110 ${gy - 10} L 150 ${gy - 3} L 200 ${gy - 9} L 260 ${gy - 1} L 260 ${gy} Z`} fill="#2b4a2e" />
    </svg>
  );
}

function draw(cv: HTMLCanvasElement, f: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, w, h);
  for (const st of FAINT) { ctx.globalAlpha = st.a; ctx.fillStyle = '#fff'; ctx.fillRect(st.x * w, st.y * h, st.s, st.s); }
  ctx.globalAlpha = 1;

  const cx = w / 2, cy = h * 0.47;
  const rx = Math.min(w * 0.4, h * 0.95), ry = Math.min(rx * 0.34, h * 0.26);
  const sunR = Math.min(w, h) * 0.07;
  const fs = Math.round(Math.max(13, Math.min(w, h) / 34));

  // dráha Země
  ctx.strokeStyle = 'rgba(127,211,255,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 7]);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);

  // popisky ročních období u dráhy
  ctx.font = `700 ${fs - 1}px VisbyRound, system-ui, sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(154,166,209,.85)';
  const at = (g: number) => ({ x: cx + rx * Math.sin(2 * Math.PI * g), y: cy + ry * Math.cos(2 * Math.PI * g) });
  for (const [g, t] of [[0, 'jaro'], [0.25, 'léto'], [0.5, 'podzim'], [0.75, 'zima']] as const) {
    const q = at(g);
    const lx = Math.max(30, Math.min(w - 30, q.x));
    const ly = g === 0 ? q.y + fs + 30 : g === 0.5 ? q.y - 30 : q.y - Math.max(48, Math.min(w, h) * 0.12);
    ctx.fillText(t, lx, ly);
  }

  const p = at(f);
  const depth = (p.y - cy) / ry; // −1 vzadu … 1 vpředu
  const er = Math.max(16, Math.min(w, h) * 0.055) * (1 + depth * 0.12);
  const earth = () => {
    const la = Math.atan2(cy - p.y, cx - p.x);
    drawPlanet(ctx, ZEME, p.x, p.y, er, la);
    // osa Země: pořád nakloněná stejně (vrchol doleva)
    const tilt = (23.5 * Math.PI) / 180;
    const ax = Math.sin(-tilt), ay = -Math.cos(tilt);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p.x - ax * er * 1.55, p.y - ay * er * 1.55); ctx.lineTo(p.x + ax * er * 1.55, p.y + ay * er * 1.55); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x + ax * er * 1.55, p.y + ay * er * 1.55, 2.5, 0, 6.283); ctx.fill();
    // naše místo (Česko) – na severní polovině
    const lat = (50 * Math.PI) / 180;
    const mx = p.x + Math.sin(-tilt) * Math.sin(lat) * er * 0.98, my = p.y - Math.cos(tilt) * Math.sin(lat) * er * 0.98;
    ctx.fillStyle = '#f0a12c'; ctx.strokeStyle = '#2a1700'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx, my, 4.5, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.font = `700 ${fs - 2}px VisbyRound, system-ui, sans-serif`; ctx.fillStyle = '#ffd98a'; ctx.textAlign = 'left';
    ctx.fillText('my', mx + 8, my - 4);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(231,236,255,.9)'; ctx.font = `700 ${fs}px VisbyRound, system-ui, sans-serif`;
    ctx.fillText('Země', p.x, p.y + er * 1.55 + fs + 4);
  };
  if (depth < 0) earth();
  drawSun(ctx, cx, cy, sunR);
  ctx.font = `700 ${fs}px VisbyRound, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd98a';
  ctx.fillText('Slunce', cx, cy + sunR + fs + 6);
  if (depth >= 0) earth();
}

const FAINT = (() => { let s = 7; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; return Array.from({ length: 140 }, () => ({ x: r(), y: r(), s: 0.5 + r(), a: 0.2 + r() * 0.5 })); })();
