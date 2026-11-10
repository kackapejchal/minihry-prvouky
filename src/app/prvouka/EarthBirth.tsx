import React, { useEffect, useRef, useState } from 'react';
import { SPACE_PLANETS, drawPlanet, drawSun } from './space-engine';

/**
 * Jak vznikla Země (Model fází Měsíce → Vyzkoušej si). Klidná animace jako Jak vznikl Měsíc:
 * kolem mladého Slunce krouží prach a kamínky, slepují se, vznikne horká mladá Země, ta vychladne.
 * Stejné textury Země a Slunce jako v ostatních modelech. Po dohrání se sama vrátí na fáze.
 */

const ZEME = SPACE_PLANETS.find((p) => p.id === 'zeme')!;
const STEPS: Array<{ at: number; text: string }> = [
  { at: 0, text: 'Před dávnými a dávnými lety kolem mladého Slunce kroužil prach a kamínky.' },
  { at: 5, text: 'Kousky do sebe narážely a slepovaly se do větších a větších kamenů.' },
  { at: 10, text: 'Z jednoho takového shluku vznikla horká mladá Země.' },
  { at: 15, text: 'Byla ještě celá horká, když do ní narazila menší planeta – tak vznikl Měsíc. Vychladla až potom.' },
];
const END = 20;

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const ease = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
const DUST = (() => { const r = rng(21); return Array.from({ length: 260 }, () => ({ ring: 0.55 + r() * 0.5, a0: r() * Math.PI * 2, size: 0.8 + r() * 2.2, join: 6 + r() * 5, warm: r() })); })();
const FAINT = (() => { const r = rng(4); return Array.from({ length: 140 }, () => ({ x: r(), y: r(), s: 0.5 + r(), a: 0.2 + r() * 0.5 })); })();

export function EarthBirth({ onClose, next }: { onClose: () => void; next?: { question: string; label: string; onClick: () => void } }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [t0, setT0] = useState(() => performance.now());
  const [step, setStep] = useState(0);
  // Po dohrání nabídne navazující animaci (Země → Měsíc, Měsíc → Země) nebo návrat na fáze.
  const [done, setDone] = useState(false);
  // Bez navazující nabídky (obě videa už proběhla) se po dohrání samo vrátí na model.
  useEffect(() => { if (!done || next) return; const id = window.setTimeout(() => closeRef.current(), 2000); return () => window.clearTimeout(id); }, [done, next]);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const raw = (now - t0) / 1000;
      if (raw > END + 1.5) setDone(true);
      const t = Math.min(END, raw);
      const cv = ref.current;
      if (cv) draw(cv, t);
      const s = STEPS.reduce((acc, st, i) => (t >= st.at ? i : acc), 0);
      setStep((p) => (p === s ? p : s));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [t0]);

  return (
    <div className="absolute inset-0 z-30 text-white" style={{ background: '#04060f' }}>
      <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-label="Animace: jak vznikla Země" />
      <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Zpět na fáze
        </button>
        {/* Po dohrání nenápadně nabídne navazující animaci (Země ↔ Měsíc). */}
        {done && next ? (
          <button
            type="button"
            onClick={next.onClick}
            className="inline-flex items-center gap-2 h-9 pl-1.5 pr-4 text-sm rounded-full bg-white text-[#0f1d4d] font-bold shadow-lg hover:bg-[#eef1f8] transition-colors"
            style={{ animation: 'fadeIn' + 'E' + ' .6s ease' }}
          >
            <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#f0a12c', color: '#2a1700' }} aria-hidden="true">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 ml-0.5" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>
            </span>
            {next.label}
          </button>
        ) : null}
      </div>
      <div className="absolute left-0 right-0 bottom-6 z-10 flex flex-col items-center gap-3 px-6 text-center">
        <p key={step} className="text-lg md:text-2xl font-bold leading-snug max-w-2xl" style={{ textShadow: '0 2px 10px rgba(0,0,0,.8)', animation: 'fadeInE .6s ease' }}>{STEPS[step].text}</p>
        <div className="flex items-center gap-1.5">
          {/* Klikací tečky: skok na danou část videa (dopředu i zpátky). */}
          {STEPS.map((st, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Část ${i + 1}`}
              onClick={() => { setDone(false); setT0(performance.now() - st.at * 1000); }}
              className="h-4 flex items-center"
            >
              <span className="h-1.5 rounded-full transition-all block" style={{ width: i === step ? 22 : 10, background: i <= step ? '#f0a12c' : 'rgba(255,255,255,.3)' }} />
            </button>
          ))}
        </div>
      </div>
      <style>{'@keyframes fadeInE{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'}</style>
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

  const S = Math.min(w, h);
  // Na začátku je vidět Slunce s prstencem prachu; pak se kamera přiblíží k místu, kde se slepuje Země.
  const zoom = ease((t - 9) / 4);
  const sunX = lerp(w * 0.5, -w * 0.4, zoom), sunY = h * 0.42;
  const discR = lerp(S * 0.42, S * 2.2, zoom);
  const ex = lerp(w * 0.5 + S * 0.42 * 0.8, w * 0.5, zoom), ey = lerp(h * 0.42, h * 0.42, zoom);
  drawSun(ctx, sunX, sunY, lerp(S * 0.07, S * 0.3, zoom));

  // Prach krouží kolem Slunce (elipsa) a postupně se stahuje k rodící se Zemi.
  const R = S * 0.13;
  const growK = ease((t - 5) / 7);
  for (const d of DUST) {
    const ang = d.a0 - t * 0.12 / d.ring;
    let x = sunX + Math.cos(ang) * discR * d.ring, y = sunY + Math.sin(ang) * discR * d.ring * 0.35;
    if (t > d.join) { const k = ease((t - d.join) / 1.8); x = lerp(x, ex, k); y = lerp(y, ey, k); if (k >= 1) continue; }
    ctx.globalAlpha = 0.85; ctx.fillStyle = d.warm < 0.5 ? '#d9b48a' : '#a99c8e';
    ctx.beginPath(); ctx.arc(x, y, d.size * lerp(1, 1.8, zoom), 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Rodící se Země: nejdřív hrudka kamení, pak žhavá koule, nakonec vychladne do dnešní Země.
  const r = R * Math.max(0.05, growK) * lerp(0.35, 1, zoom);
  if (growK > 0.02) {
    const cool = 0; // Země tu zůstává horká – vychladne až po vzniku Měsíce (viz Jak vznikl Měsíc)
    if (cool > 0) drawPlanet(ctx, ZEME, ex, ey, r, Math.PI * 1.08);
    const hot = 1 - cool;
    if (hot > 0) {
      const glow = ctx.createRadialGradient(ex, ey, r * 0.8, ex, ey, r * 1.7);
      glow.addColorStop(0, `rgba(255,140,60,${0.4 * hot})`); glow.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ex, ey, r * 1.7, 0, 6.283); ctx.fill();
      // dokud se lepí, je hrudka spíš hnědá kamenná; potom žhavě oranžová
      const molten = ease((t - 9) / 2);
      const g = ctx.createRadialGradient(ex - r * 0.3, ey - r * 0.3, r * 0.1, ex, ey, r * 1.08);
      g.addColorStop(0, `rgba(${Math.round(lerp(190, 255, molten))},${Math.round(lerp(160, 190, molten))},${Math.round(lerp(130, 110, molten))},${hot})`);
      g.addColorStop(0.6, `rgba(${Math.round(lerp(130, 214, molten))},${Math.round(lerp(110, 92, molten))},${Math.round(lerp(90, 36, molten))},${hot})`);
      g.addColorStop(1, `rgba(${Math.round(lerp(70, 110, molten))},${Math.round(lerp(60, 34, molten))},${Math.round(lerp(50, 16, molten))},${hot})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, r * 1.08, 0, 6.283); ctx.fill();
    }
    if (t > 10) {
      ctx.font = `700 ${Math.max(13, S * 0.03)}px VisbyRound, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(231,236,255,.85)';
      ctx.fillText(cool > 0.5 ? 'Země' : 'mladá Země', ex, ey + r * 1.08 + Math.max(30, S * 0.06));
    }
  }
  if (zoom < 0.5) {
    ctx.font = `700 ${Math.max(13, S * 0.03)}px VisbyRound, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,217,138,${0.9 * (1 - zoom * 2)})`;
    ctx.fillText('mladé Slunce', sunX, sunY + S * 0.07 + 24);
  }
}
