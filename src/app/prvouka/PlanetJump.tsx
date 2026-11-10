import React, { useEffect, useRef, useState } from 'react';
import type { SolarBodyId } from './solar-3d';
import { moonTexture, planetTexture } from './space-engine';

/** Povrch pod nohama ze stejné textury jako planeta v modelu (výřez ze středu, ať není vidět okraj koule). */
const surfCache = new Map<string, string>();
function surface(b: JumpBody): string {
  const hit = surfCache.get(b); if (hit) return hit;
  const src = b === 'mesic' ? moonTexture() : planetTexture(b as any, 512);
  const c = document.createElement('canvas'); c.width = 512; c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, src.width * 0.18, src.height * 0.36, src.width * 0.64, src.height * 0.28, 0, 0, 512, 192);
  const url = c.toDataURL(); surfCache.set(b, url); return url;
}

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
const HOLD = 0.7; // chvíli visí ve stejné výšce, než se pustí – ať je vidět, že startují stejně

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
export function JumpStage({ bodies, names, thumbs, action, onDone, weight = 30, surfaces = {} }: {
  weight?: number;
  /** Povrch ze 3D modelu v právě zvoleném vzhledu (Opravdový / Kreslený); bez něj kreslená textura. */
  surfaces?: Partial<Record<JumpBody, string>>;
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
  const pxPerM = (groundY - box.h * 0.36) / maxM; // nahoře místo pro název tělesa
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
        const dropT = action?.kind === 'micek' ? Math.min(Math.max(0, t - HOLD), Math.sqrt((2 * DROP_M) / g)) : 0;
        const fallen = action?.kind === 'micek' ? Math.min(DROP_M, (g * dropT * dropT) / 2) : 0;
        const ballY = groundY - (DROP_M - fallen) * pxPerM;
        const cx = colW * i + colW * 0.42;
        const peakY = groundY - jumpHeight(b) * pxPerM;
        return (
          <div key={b} className="absolute top-0 bottom-0" style={{ left: colW * i, width: colW }}>
            {i > 0 ? <div className="absolute top-[8%] bottom-[8%] left-0 w-px" style={{ background: 'rgba(255,255,255,.12)' }} /> : null}
            {/* hlavička sloupce */}
            <div className="absolute left-0 right-0 top-3 flex flex-col items-center gap-1 text-white">
                            <span className="text-lg md:text-2xl font-bold">{names[b]}</span>
              {/* Tabulka přímo v zobrazení: váha a výška skoku na tomhle tělese. */}
              <div className="mt-1 flex items-end gap-5 md:gap-8">
                <span className="flex flex-col items-center">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#9aa6d1]">váha ukáže</span>
                  <span className="text-2xl md:text-4xl font-bold tabular-nums leading-none mt-1">{formatKg(weight * PULL[b])}</span>
                </span>
                <span className="flex flex-col items-center">
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#9aa6d1]">vyskočíš</span>
                  <span className="text-2xl md:text-4xl font-bold tabular-nums leading-none mt-1 text-[#7fd3ff]">{formatMeters(jumpHeight(b))}</span>
                </span>
              </div>
            </div>
            {/* značka nejvyššího bodu skoku: o tolik nad hlavou dítěte (v nejvyšším bodě se jí dotkne hlavou) */}
            {action?.kind !== 'micek' ? (
              <>
                <div className="absolute border-t-2 border-dashed" style={{ left: colW * 0.18, width: colW * 0.48, top: peakY - kid * 2, borderColor: 'rgba(127,211,255,.55)' }} />
                <span className="absolute text-xs md:text-sm font-bold text-[#7fd3ff]" style={{ left: colW * 0.68, top: peakY - kid * 2 - 10 }}>{formatMeters(jumpHeight(b))}</span>
              </>
            ) : null}
            {/* míček */}
            {/* odkud míček padá: stejná výška (2 m) ve všech sloupcích */}
            {action?.kind === 'micek' ? (
              <>
                <div className="absolute border-t-2 border-dashed" style={{ left: colW * 0.18, width: colW * 0.6, top: groundY - DROP_M * pxPerM, borderColor: 'rgba(240,161,44,.7)' }} />
                <span className="absolute text-xs md:text-sm font-bold text-[#f0a12c]" style={{ left: colW * 0.8, top: groundY - DROP_M * pxPerM - 10 }}>{formatMeters(DROP_M)}</span>
              </>
            ) : null}
            {action?.kind !== 'skok' ? (
              // Míček: jednoduchý jednobarevný kruh (barva tlačítek), bez záře.
              <span className="absolute rounded-full" style={{ left: colW * 0.62, top: ballY - 26, width: 26, height: 26, background: '#f0a12c', border: '3px solid #b8741a' }} />
            ) : null}
            {/* postavička */}
            <Kid x={cx - colW * i} y={groundY - up * pxPerM} size={kid} />
            {/* povrch */}
            <div className="absolute left-0 right-0 bottom-0" style={{ top: groundY, backgroundColor: GROUND[b], backgroundImage: `${GAS.includes(b) ? 'linear-gradient(180deg, rgba(255,255,255,.15), rgba(6,10,28,.55)), ' : 'linear-gradient(180deg, rgba(255,255,255,.12), rgba(0,0,0,.25)), '}url(${surfaces[b] ?? surface(b)})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 6px 10px rgba(0,0,0,.25)' }} />
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
  return kind === 'skok' ? (2 * Math.sqrt(2 * EARTH_G * EARTH_JUMP_M)) / g : HOLD + Math.sqrt((2 * DROP_M) / g);
}

/**
 * Dítě ve výskoku – kreslené v linkovém stylu ilustrací Vividbooks (Vlastivěda): tmavá linka, plné barvy,
 * celá postava se všemi končetinami. Nohy na čáře y.
 */
export function Kid({ x, y, size, inline = false }: { x: number; y: number; size: number; inline?: boolean }) {
  const hgt = size * 2, wid = hgt * 0.62;
  const L = { stroke: '#2b2f3a', strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 62 100" className={inline ? '' : 'absolute'} style={inline ? { width: wid, height: hgt, overflow: 'visible' } : { left: x - wid / 2, top: y - hgt, width: wid, height: hgt, overflow: 'visible' }} aria-hidden="true">
      {/* ruce nahoře do V */}
      <path d="M22 40 L11 24 L8 15" fill="none" {...L} strokeWidth={6.5} stroke="#2b2f3a" />
      <path d="M22 40 L11 24 L8 15" fill="none" stroke="#ffd9c0" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 40 L51 24 L54 15" fill="none" {...L} strokeWidth={6.5} stroke="#2b2f3a" />
      <path d="M40 40 L51 24 L54 15" fill="none" stroke="#ffd9c0" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {/* rukávy */}
      <path d="M20 37 L15 31 L19 28 L25 35 Z" fill="#e8574a" {...L} />
      <path d="M42 37 L47 31 L43 28 L37 35 Z" fill="#e8574a" {...L} />
      {/* nohy (kalhoty) a boty */}
      <path d="M25 62 L22 76 L18 86" fill="none" {...L} strokeWidth={8.5} stroke="#2b2f3a" />
      <path d="M25 62 L22 76 L18 86" fill="none" stroke="#4a6fb3" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 62 L40 76 L44 86" fill="none" {...L} strokeWidth={8.5} stroke="#2b2f3a" />
      <path d="M37 62 L40 76 L44 86" fill="none" stroke="#4a6fb3" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 86 Q12 82 17 83 L22 85 Q23 89 20 90 L13 90 Q11 89 12 86 Z" fill="#ffffff" {...L} />
      <path d="M50 86 Q50 82 45 83 L40 85 Q39 89 42 90 L49 90 Q51 89 50 86 Z" fill="#ffffff" {...L} />
      {/* tričko */}
      <path d="M20 36 Q31 31 42 36 L41 62 Q31 65 21 62 Z" fill="#e8574a" {...L} />
      {/* krk a hlava */}
      <rect x="28" y="30" width="6" height="5" fill="#ffd9c0" />
      <circle cx="31" cy="20" r="11" fill="#ffd9c0" {...L} />
      {/* vlasy s culíkem */}
      <path d="M20 19 Q21 8 31 8 Q41 8 42 18 Q36 13 30 14 Q24 15 20 19 Z" fill="#8a5a36" {...L} />
      <path d="M41 13 Q49 12 50 20 Q47 26 43 22" fill="#8a5a36" {...L} />
      {/* obličej */}
      <circle cx="27" cy="21" r="1.3" fill="#2b2f3a" />
      <circle cx="35" cy="21" r="1.3" fill="#2b2f3a" />
      <path d="M27 26 Q31 29.5 35 26" fill="none" {...L} strokeWidth={1.4} />
      <circle cx="24.5" cy="24.5" r="1.8" fill="#f4a3a0" opacity="0.7" />
      <circle cx="37.5" cy="24.5" r="1.8" fill="#f4a3a0" opacity="0.7" />
    </svg>
  );
}
