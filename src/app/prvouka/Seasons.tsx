import React, { useState } from 'react';

/**
 * Proč máme roční období? (Model Sluneční soustavy → Země → Vyzkoušej si)
 * Jednoduše pro 3. třídu: hlavní je to, co děti samy vidí – naše krajina, jak vysoko je Slunce v poledne
 * a jak dlouhý je den. Nakloněnou osu Země (látka vyšších ročníků) záměrně neukazuje.
 * Hodnoty přibližně pro Česko.
 */

type Season = 'jaro' | 'leto' | 'podzim' | 'zima';
const ORDER: Season[] = ['jaro', 'leto', 'podzim', 'zima'];
const NAME: Record<Season, string> = { jaro: 'Jaro', leto: 'Léto', podzim: 'Podzim', zima: 'Zima' };
const ICON: Record<Season, string> = { jaro: '🌱', leto: '☀️', podzim: '🍂', zima: '❄️' };
/** výška Slunce v poledne (0–1 výšky oblohy) a délka dne v hodinách */
const SUN: Record<Season, { high: number; day: number; word: string }> = {
  leto: { high: 0.85, day: 16, word: 'vysoko' },
  jaro: { high: 0.55, day: 12, word: 'napůl' },
  podzim: { high: 0.55, day: 12, word: 'napůl' },
  zima: { high: 0.24, day: 8, word: 'nízko' },
};
const TEXT: Record<Season, string> = {
  leto: 'V létě je Slunce v poledne vysoko a den je dlouhý. Proto je teplo.',
  zima: 'V zimě je Slunce i v poledne nízko a den je krátký. Proto je zima.',
  jaro: 'Na jaře jsou den a noc skoro stejně dlouhé. Slunce je každý den o kousek výš.',
  podzim: 'Na podzim jsou den a noc skoro stejně dlouhé. Slunce je každý den o kousek níž.',
};
const FONT = { fontFamily: 'VisbyRound, system-ui, sans-serif' };

export function Seasons({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Season>('leto');
  const sun = SUN[s];
  return (
    <div className="absolute inset-0 z-30 text-white flex flex-col overflow-y-auto" style={{ background: '#0b1230' }}>
      <div className="flex items-center gap-2 px-4 pt-3 flex-wrap">
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
              className="h-9 px-3.5 rounded-full text-sm font-bold transition-colors"
              style={{ background: s === x ? '#fde9c6' : 'rgba(255,255,255,.12)', color: s === x ? '#0f1d4d' : '#fff' }}
            >
              {ICON[x]} {NAME[x]}
            </button>
          ))}
        </div>
      </div>

      {/* Naše krajina: Slunce v poledne */}
      <div className="px-4 pt-3">
        <Landscape season={s} />
      </div>

      <div className="px-5 py-4">
        <div className="flex flex-col gap-3">
          <p className="text-lg md:text-xl font-bold leading-snug">{TEXT[s]}</p>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#9aa6d1] mb-1.5">Den trvá asi {sun.day} hodin</p>
            <div className="flex h-5 rounded-full overflow-hidden max-w-md" aria-hidden="true">
              {Array.from({ length: 24 }, (_, h) => {
                const light = Math.abs(h + 0.5 - 12) < sun.day / 2;
                return <span key={h} className="flex-1" style={{ background: light ? '#f0c35a' : '#1c2550', borderRight: h < 23 ? '1px solid rgba(11,18,48,.5)' : 'none' }} />;
              })}
            </div>
            <div className="flex justify-between text-[10px] font-bold text-[#9aa6d1] mt-1 max-w-md"><span>noc</span><span>den</span><span>noc</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Krajina se stromem; oblouk ukazuje cestu Slunce po obloze, Slunce je v poledne. */
function Landscape({ season }: { season: Season }) {
  const W = 600, H = 260, gy = 210;
  const sun = SUN[season];
  const top = gy - sun.high * 180;
  const sky = season === 'zima' ? '#7d97c9' : '#5aa0e8';
  const ground = season === 'zima' ? '#eef3fb' : season === 'podzim' ? '#8a8f3a' : '#4f9a3f';
  const crown = season === 'leto' ? '#2f7d32' : season === 'jaro' ? '#6cc04a' : season === 'podzim' ? '#e08a2a' : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-2xl block" style={{ maxHeight: '46vh' }} aria-label={`Slunce v poledne je ${sun.word}`}>
      <rect width={W} height={H} fill={sky} />
      {/* cesta Slunce po obloze od rána do večera */}
      <path d={`M 40 ${gy} Q ${W / 2} ${2 * top - gy} ${W - 40} ${gy}`} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="2.5" strokeDasharray="6 7" />
      <circle cx={W / 2} cy={top} r="24" fill="#ffd54a" stroke="#fff3b0" strokeWidth="4" />
      <text x={W / 2} y={top - 36} fontSize="18" fontWeight="700" fill="#fff" textAnchor="middle" style={FONT}>v poledne {sun.word}</text>
      <text x="40" y={gy - 12} fontSize="15" fontWeight="700" fill="#fff" style={FONT}>ráno</text>
      <text x={W - 40} y={gy - 12} fontSize="15" fontWeight="700" fill="#fff" textAnchor="end" style={FONT}>večer</text>
      {/* zem, strom, domeček */}
      <path d={`M0 ${gy} Q 150 ${gy - 14} 300 ${gy - 4} T 600 ${gy - 6} V ${H} H 0 Z`} fill={ground} />
      <rect x="118" y={gy - 70} width="12" height="66" rx="4" fill="#6b4423" />
      {crown ? (
        <>
          <circle cx="124" cy={gy - 86} r="34" fill={crown} />
          {season === 'jaro' ? [[-16, -96], [10, -110], [18, -80], [-6, -74]].map(([dx, dy], i) => <circle key={i} cx={124 + dx} cy={gy + dy} r="5" fill="#ffd1e0" />) : null}
        </>
      ) : (
        <g stroke="#6b4423" strokeWidth="5" strokeLinecap="round">
          <path d={`M124 ${gy - 66} L100 ${gy - 104}`} /><path d={`M124 ${gy - 70} L150 ${gy - 108}`} /><path d={`M124 ${gy - 80} L124 ${gy - 116}`} />
        </g>
      )}
      <path d={`M440 ${gy - 6} V ${gy - 50} L 470 ${gy - 76} L 500 ${gy - 50} V ${gy - 6} Z`} fill="#f4e3c3" />
      <path d={`M432 ${gy - 48} L 470 ${gy - 82} L 508 ${gy - 48}`} fill="none" stroke={season === 'zima' ? '#ffffff' : '#c2602a'} strokeWidth="8" strokeLinejoin="round" />
      <rect x="462" y={gy - 34} width="16" height="28" rx="2" fill="#8a5a3a" />
    </svg>
  );
}
