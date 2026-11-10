import React from 'react';
import type { SolarBodyId } from './solar-3d';

/**
 * Jaká je tu teplota? (Model Sluneční soustavy → detail planety → Vyzkoušej si)
 * Dva teploměry vedle sebe: Země a vybrané těleso. Přibližné teploty na povrchu
 * (u plynných planet nahoře v mracích), ve dne a v noci. Značky „voda vře / mrzne“ pro srovnání.
 */

export type TempBody = 'mesic' | 'merkur' | 'venuse' | 'zeme' | 'mars' | 'jupiter' | 'saturn' | 'uran' | 'neptun';

/** Přibližné teploty ve °C: den (nejvíc) a noc (nejmíň). U plynných planet jedna teplota v mracích. */
export const TEMPS: Record<TempBody, { den: number; noc: number; text: string; avg?: boolean }> = {
  zeme: { den: 15, noc: 15, avg: true, text: 'Průměrná teplota na celé Zemi za celý rok je asi 15 °C. Pro život je to tak akorát.' },
  mesic: { den: 120, noc: -170, text: 'Měsíc nemá vzduch, který by držel teplo. Ve dne je tam teplo jako ve vroucí vodě a v noci strašlivá zima.' },
  merkur: { den: 430, noc: -180, text: 'Merkur je blízko Slunce: ve dne by tě upeklo. Nemá ale vzduch, a tak v noci mrzne víc než kdekoli na Zemi.' },
  venuse: { den: 465, noc: 465, text: 'Nejteplejší planeta. Hustá oblaka drží teplo jako peřina, takže je tam horko ve dne i v noci – víc než v troubě.' },
  mars: { den: 20, noc: -100, text: 'Ve dne bývá na Marsu někde jako u nás na jaře, ale v noci mrzne mnohem víc než na našich pólech.' },
  jupiter: { den: -110, noc: -110, text: 'Jupiter je daleko od Slunce. Nahoře v jeho mracích je ledová zima – bez skafandru by to nešlo.' },
  saturn: { den: -140, noc: -140, text: 'Saturn je ještě dál od Slunce než Jupiter, a tak je v jeho mracích ještě větší zima.' },
  uran: { den: -195, noc: -195, text: 'Uran patří k nejstudenějším planetám. Taková zima na Zemi nikde není.' },
  neptun: { den: -200, noc: -200, text: 'Neptun je nejdál od Slunce. Je to ledový svět, kam teplo ze Slunce skoro nedolétne.' },
};

const MIN = -220, MAX = 480;

export function TempStage({ body, names, thumbs }: { body: TempBody; names: Record<string, string>; thumbs: Partial<Record<SolarBodyId, string>> }) {
  const list: TempBody[] = ['zeme', body];
  const pct = (c: number) => ((c - MIN) / (MAX - MIN)) * 100;
  const marks = [
    { c: 100, label: 'voda vře' },
    { c: 0, label: 'voda mrzne' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex-1 grid grid-cols-2 gap-6 px-8 pt-16 pb-24 min-h-0">
        {list.map((b) => {
          const t = TEMPS[b];
          const same = t.den === t.noc;
          const hot = t.den > 60, cold = t.noc < -50;
          return (
            <div key={b} className="flex flex-col items-center min-h-0">
              <div className="flex items-center gap-2">
                {thumbs[b as SolarBodyId] ? <img src={thumbs[b as SolarBodyId]} alt="" className="w-9 h-9 object-contain" /> : null}
                <span className="text-xl md:text-2xl font-bold">{names[b]}</span>
              </div>
              <div className="mt-2 flex items-end gap-5">
                {same ? (
                  <span className="flex flex-col items-center"><span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#9aa6d1]">{t.avg ? 'průměrně' : 've dne i v noci'}</span><span className="text-2xl md:text-4xl font-bold tabular-nums leading-none mt-1" style={{ color: tColor(t.den) }}>{fmt(t.den)}</span></span>
                ) : (
                  <>
                    <span className="flex flex-col items-center"><span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#9aa6d1]">ve dne až</span><span className="text-2xl md:text-4xl font-bold tabular-nums leading-none mt-1" style={{ color: tColor(t.den) }}>{fmt(t.den)}</span></span>
                    <span className="flex flex-col items-center"><span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#9aa6d1]">v noci až</span><span className="text-2xl md:text-4xl font-bold tabular-nums leading-none mt-1" style={{ color: tColor(t.noc) }}>{fmt(t.noc)}</span></span>
                  </>
                )}
              </div>
              {/* teploměr */}
              <div className="relative flex-1 w-full max-w-[220px] mt-4 min-h-[160px]">
                {/* trubička a značky mají stejnou výšku, ať značky sedí na stupnici */}
                <div className="absolute inset-x-0 top-0 bottom-6">
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-6 rounded-full" style={{ background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.35)' }}>
                    {/* sloupec od baňky nahoru až k (denní) teplotě – jako opravdový teploměr */}
                    <div className="absolute left-1 right-1 bottom-0 rounded-full" style={{ height: `${pct(t.den)}%`, minHeight: 10, background: tColor(t.den) }} />
                    {!same ? (
                      // noční teplota: značka na stupnici
                      <div className="absolute -left-2 -right-2 h-0.5 rounded" style={{ bottom: `${pct(t.noc)}%`, background: tColor(t.noc), boxShadow: '0 0 0 1px rgba(6,10,28,.6)' }} />
                    ) : null}
                  </div>
                  {!same ? (
                    <div className="absolute flex items-center" style={{ bottom: `${pct(t.noc)}%`, right: 'calc(50% + 22px)', transform: 'translateY(50%)' }}>
                      <span className="text-[10px] md:text-xs font-bold whitespace-nowrap" style={{ color: tColor(t.noc) }}>v noci {fmt(t.noc)}</span>
                    </div>
                  ) : null}
                  {marks.map((m) => (
                    <div key={m.c} className="absolute left-0 right-0 flex items-center" style={{ bottom: `${pct(m.c)}%` }}>
                      <span className="flex-1 border-t border-dashed" style={{ borderColor: 'rgba(255,255,255,.3)' }} />
                      <span className="ml-2 text-[10px] md:text-xs font-bold text-white/70 whitespace-nowrap">{m.label} {m.c} °C</span>
                    </div>
                  ))}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-10 h-10 rounded-full" style={{ background: tColor(t.den), border: '2px solid rgba(255,255,255,.35)' }} />
              </div>
              <span className="mt-4 text-lg md:text-2xl font-bold">{hot && cold ? '🥵 ve dne · 🥶 v noci' : hot ? '🥵 horko' : cold ? '🥶 zima' : '🙂 tak akorát'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const fmt = (c: number) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)} °C`;
function tColor(c: number) {
  if (c >= 200) return '#ff6a3d';
  if (c >= 60) return '#f0a12c';
  if (c >= 0) return '#7be0a0';
  if (c >= -120) return '#7fd3ff';
  return '#a9b8ff';
}
