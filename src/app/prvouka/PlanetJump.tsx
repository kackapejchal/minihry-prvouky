import React, { useEffect, useRef, useState } from 'react';
import type { SolarBodyId } from './solar-3d';

/**
 * Skákání na planetách (Model Sluneční soustavy → Vyzkoušej si).
 * Bez slova „gravitace“: větší planeta tě víc přitahuje – vyskočíš níž, míček padá rychleji, váha ukáže víc.
 * Čísla jsou skutečná (tíhové zrychlení na povrchu vůči Zemi), zaokrouhlená pro děti.
 */

export type JumpBody = 'zeme' | 'mesic' | 'merkur' | 'venuse' | 'mars' | 'jupiter' | 'saturn' | 'uran' | 'neptun';

/** Kolikrát víc (nebo míň) tě těleso přitahuje než Země. */
export const PULL: Record<JumpBody, number> = {
  zeme: 1, mesic: 0.166, merkur: 0.38, venuse: 0.91, mars: 0.38, jupiter: 2.53, saturn: 1.07, uran: 0.89, neptun: 1.14,
};
/** Plynné planety nemají pevný povrch – postavička stojí „na mracích“. */
export const GAS: JumpBody[] = ['jupiter', 'saturn', 'uran', 'neptun'];
export const JUMP_CHOICES: JumpBody[] = ['mesic', 'merkur', 'venuse', 'mars', 'jupiter', 'saturn', 'uran', 'neptun'];
/** Barva „země pod nohama“. */
const GROUND: Record<JumpBody, string> = {
  zeme: '#4f8a3c', mesic: '#8d8a84', merkur: '#8a7f73', venuse: '#c9a35a', mars: '#b5532f',
  jupiter: '#c99a6b', saturn: '#d8c08a', uran: '#7fc7cf', neptun: '#3e63c9',
};

const EARTH_JUMP_M = 0.5; // výskok na Zemi
const EARTH_G = 9.81;
const DROP_M = 2; // míček padá z výšky 2 m

export const jumpHeight = (b: JumpBody) => EARTH_JUMP_M / PULL[b];
export function formatMeters(m: number) {
  if (m < 1) return `${Math.round(m * 100)} cm`;
  const r = Math.round(m * 10) / 10;
  return `${String(r).replace('.', ',')} m`;
}
export function formatKg(kg: number) {
  const r = kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg);
  return `${String(r).replace('.', ',')} kg`;
}
export const TIMES = (b: JumpBody) => {
  const p = PULL[b];
  if (Math.abs(p - 1) < 0.12) return 'skoro stejně jako na Zemi';
  return p < 1 ? `${Math.round(1 / p)}× méně než na Zemi` : `${String(Math.round(p * 10) / 10).replace('.', ',')}× víc než na Zemi`;
};

type Action = { kind: 'skok' | 'micek'; t0: number } | null;

/** Plocha s 2–3 sloupci vedle sebe: postavička, která skáče, a míček, který padá. */
export function JumpStage({ bodies, names, thumbs, action, onDone }: {
  bodies: JumpBody[];
  names: Record<string, string>;
  thumbs: Partial<Record<SolarBodyId, string>>;
  action: Action;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 800, h: 500 });
  const [now, setNow] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Animace běží jen během skoku / pádu.
  useEffect(() => {
    if (!action) return;
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - action.t0) / 1000;
      setNow(t);
      const longest = Math.max(...bodies.map((b) => duration(action.kind, b)));
      if (t > longest + 0.4) { onDone(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const colW = box.w / bodies.length;
  const groundY = box.h * 0.78;
  // Měřítko: nejvyšší skok (Měsíc ~3 m) se vejde do sloupce, pád z 2 m taky.
  const maxM = Math.max(DROP_M, ...bodies.map(jumpHeight));
  const pxPerM = (groundY - box.h * 0.3) / maxM; // nahoře místo pro název tělesa
  const kid = Math.max(36, Math.min(64, colW * 0.22));

  return (
    <div ref={ref} className="absolute inset-0">
      {bodies.map((b, i) => {
        const g = EARTH_G * PULL[b];
        const t = action ? now : 0;
        // skok: y = v0 t − g t² / 2, v0 stejné na všech planetách (dítě se odrazí stejně silně)
        const v0 = Math.sqrt(2 * EARTH_G * EARTH_JUMP_M);
        const jumpT = action?.kind === 'skok' ? Math.min(t, 2 * v0 / g) : 0;
        const up = Math.max(0, v0 * jumpT - (g * jumpT * jumpT) / 2);
        const dropT = action?.kind === 'micek' ? Math.min(t, Math.sqrt((2 * DROP_M) / g)) : 0;
        const fallen = action?.kind === 'micek' ? Math.min(DROP_M, (g * dropT * dropT) / 2) : 0;
        const ballY = groundY - (DROP_M - fallen) * pxPerM;
        const cx = colW * i + colW * 0.42;
        const peakY = groundY - jumpHeight(b) * pxPerM;
        return (
          <div key={b} className="absolute top-0 bottom-0" style={{ left: colW * i, width: colW }}>
            {i > 0 ? <div className="absolute top-[8%] bottom-[8%] left-0 w-px" style={{ background: 'rgba(255,255,255,.12)' }} /> : null}
            {/* hlavička sloupce */}
            <div className="absolute left-0 right-0 top-3 flex flex-col items-center gap-1 text-white">
              {thumbs[b as SolarBodyId] ? <img src={thumbs[b as SolarBodyId]} alt="" className="w-10 h-10 object-contain" /> : null}
              <span className="text-base md:text-lg font-bold">{names[b]}</span>
            </div>
            {/* značka nejvyššího bodu skoku */}
            {action?.kind !== 'micek' ? (
              <>
                <div className="absolute border-t-2 border-dashed" style={{ left: colW * 0.18, width: colW * 0.48, top: peakY - kid, borderColor: 'rgba(127,211,255,.55)' }} />
                <span className="absolute text-xs md:text-sm font-bold text-[#7fd3ff]" style={{ left: colW * 0.68, top: peakY - kid - 10 }}>{formatMeters(jumpHeight(b))}</span>
              </>
            ) : null}
            {/* míček */}
            {action?.kind === 'micek' ? (
              <span className="absolute rounded-full" style={{ left: colW * 0.62, top: ballY - 18, width: 18, height: 18, background: 'radial-gradient(circle at 35% 35%, #ffd98a, #f0a12c 70%)', boxShadow: '0 0 10px rgba(240,161,44,.6)' }} />
            ) : null}
            {/* postavička */}
            <Kid x={cx - colW * i} y={groundY - up * pxPerM} size={kid} />
            {/* povrch */}
            <div className="absolute left-0 right-0 bottom-0" style={{ top: groundY, background: GAS.includes(b) ? `linear-gradient(180deg, ${GROUND[b]}cc, ${GROUND[b]}33)` : GROUND[b], borderTop: `3px solid ${GROUND[b]}` }} />
            <span className="absolute left-0 right-0 text-center text-xs md:text-sm font-bold text-white/85" style={{ top: groundY + 10 }}>
              {GAS.includes(b) ? 'nemá pevný povrch – stojíme na mracích' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function duration(kind: 'skok' | 'micek', b: JumpBody) {
  const g = EARTH_G * PULL[b];
  return kind === 'skok' ? (2 * Math.sqrt(2 * EARTH_G * EARTH_JUMP_M)) / g : Math.sqrt((2 * DROP_M) / g);
}

/** Jednoduchá postavička (dítě) – nohy na čáře y. */
function Kid({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg viewBox="0 0 40 60" className="absolute" style={{ left: x - size / 2, top: y - size * 1.5, width: size, height: size * 1.5, overflow: 'visible' }} aria-hidden="true">
      <circle cx="20" cy="11" r="9" fill="#ffd6b0" />
      <path d="M11 9 Q20 -1 29 9 L29 7 Q20 -3 11 7 Z" fill="#7a4a2a" />
      <rect x="10" y="20" width="20" height="20" rx="7" fill="#f0a12c" />
      <rect x="6" y="22" width="6" height="14" rx="3" fill="#f0a12c" transform="rotate(-20 9 22)" />
      <rect x="28" y="22" width="6" height="14" rx="3" fill="#f0a12c" transform="rotate(20 31 22)" />
      <rect x="12" y="38" width="7" height="20" rx="3" fill="#2e4aa8" />
      <rect x="21" y="38" width="7" height="20" rx="3" fill="#2e4aa8" />
    </svg>
  );
}
