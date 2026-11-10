import React, { useMemo, useState } from 'react';
import { GameResultScreen } from '../components/GameResultScreen';
import { PrvoukaFeedbackOverlay, PrvoukaProgress } from './PrvoukaKit';

/**
 * Oblékni se podle počasí (Orientace v čase) – šatník jako v oblékačkách.
 * Uprostřed Sam, dole šatník po částech těla. Věc ze stejné části se vymění (svetr nahradí tričko…).
 * Venku je nějaké počasí; až je dítě hotové, klikne „Jdeme ven!“ a hra řekne, jestli je Sam oblečený
 * dobře – nebo vlídně, co ještě změnit. Volná hra (bez počasí) jde zapnout v nastavení.
 *
 * Ilustrace: Sam a oblečení z obrázků od autorky (public/prvouka/ill/obleceni). Sam je letní
 * (žluté tričko, kraťasy, sandály) – to je jeho základ, když v dané části nic jiného nemá.
 * Pozice věcí jsou v pixelech obrázku sam.png (174 × 382).
 */

const INK = '#2a3a8c';
const ART = `${import.meta.env.BASE_URL}prvouka/ill/obleceni`;
const SAM_W = 174, SAM_H = 382;

type Slot = 'hlava' | 'krk' | 'vrsek' | 'bunda' | 'dolu' | 'boty' | 'ruce' | 'destnik';
interface Piece { src: string; box: [number, number, number, number]; z: number }
interface Item { id: string; name: string; slot: Slot; pieces: Piece[]; thumb: string }

const ITEMS: Item[] = [
  { id: 'cepice', name: 'Čepice', slot: 'hlava', thumb: 'cepice', pieces: [{ src: 'cepice', box: [29, -13, 149, 87], z: 9 }] },
  { id: 'sala', name: 'Šála', slot: 'krk', thumb: 'sala', pieces: [{ src: 'sala', box: [44, 152, 136, 246], z: 8 }] },
  { id: 'triko', name: 'Pruhované tričko', slot: 'vrsek', thumb: 'triko', pieces: [{ src: 'triko', box: [24, 150, 156, 250], z: 4 }] },
  { id: 'mikina', name: 'Mikina', slot: 'vrsek', thumb: 'mikina', pieces: [{ src: 'mikina', box: [14, 139, 172, 260], z: 4 }] },
  { id: 'svetr', name: 'Svetr', slot: 'vrsek', thumb: 'svetr', pieces: [{ src: 'svetr', box: [17, 137, 167, 255], z: 4 }] },
  { id: 'bunda', name: 'Bunda', slot: 'bunda', thumb: 'bunda', pieces: [{ src: 'bunda', box: [11, 135, 173, 257], z: 6 }] },
  { id: 'zimni-bunda', name: 'Zimní bunda', slot: 'bunda', thumb: 'zimni-bunda', pieces: [{ src: 'zimni-bunda', box: [6, 117, 181, 272], z: 6 }] },
  { id: 'dziny', name: 'Džíny', slot: 'dolu', thumb: 'dziny', pieces: [{ src: 'dziny', box: [30, 244, 156, 345], z: 2 }] },
  { id: 'kalhoty', name: 'Kalhoty', slot: 'dolu', thumb: 'kalhoty', pieces: [{ src: 'kalhoty', box: [30, 245, 156, 344], z: 2 }] },
  { id: 'tenisky', name: 'Tenisky', slot: 'boty', thumb: 'tenisky', pieces: [{ src: 'tenisky', box: [18, 334, 168, 375], z: 3 }] },
  { id: 'boty', name: 'Kotníkové boty', slot: 'boty', thumb: 'boty', pieces: [{ src: 'boty', box: [25, 329, 161, 369], z: 3 }] },
  { id: 'holinky', name: 'Holínky', slot: 'boty', thumb: 'holinky', pieces: [{ src: 'holinky', box: [26, 278, 158, 369], z: 3 }] },
  { id: 'zimni-boty', name: 'Zimní boty', slot: 'boty', thumb: 'zimni-boty', pieces: [{ src: 'zimni-boty', box: [19, 289, 166, 369], z: 3 }] },
  { id: 'palcaky', name: 'Palčáky', slot: 'ruce', thumb: 'palcak-l', pieces: [{ src: 'palcak-l', box: [1, 242, 36, 275], z: 7 }, { src: 'palcak-p', box: [151, 242, 186, 275], z: 7 }] },
  { id: 'destnik', name: 'Deštník', slot: 'destnik', thumb: 'destnik', pieces: [{ src: 'destnik', box: [146, 108, 262, 272], z: 10 }] },
];
const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
/** Co má Sam na sobě, když v dané části nic nevybral. */
const BASE: Partial<Record<Slot, string>> = { vrsek: 'žluté tričko', dolu: 'kraťasy', boty: 'sandály' };
const SHELVES: Array<{ title: string; slots: Slot[] }> = [
  { title: 'Na hlavu a krk', slots: ['hlava', 'krk'] },
  { title: 'Nahoru', slots: ['vrsek', 'bunda'] },
  { title: 'Dolů a na nohy', slots: ['dolu', 'boty'] },
  { title: 'Na ruce a do ruky', slots: ['ruce', 'destnik'] },
];

type Outfit = Partial<Record<Slot, string>>;
type WeatherId = 'prsi' | 'snezi' | 'horko' | 'fouka';
interface Weather { id: WeatherId; label: string; sky: string; temp: string; ask: string; bg: string; done: string; check: (o: Outfit) => string | null }

const warmTop = (o: Outfit) => o.vrsek === 'mikina' || o.vrsek === 'svetr' || Boolean(o.bunda);
const WEATHER: Record<WeatherId, Weather> = {
  snezi: {
    id: 'snezi', label: '❄️ Sněží', sky: '🌨️', temp: '−5 °C', bg: '#e6eef8', ask: 'Venku sněží a mrzne. Obleč Sama ven!', done: 'Sam je teple oblečený a může stavět sněhuláka.',
    check: (o) =>
      o.bunda !== 'zimni-bunda' ? 'V mrazu potřebuje Sam zimní bundu.'
      : !o.dolu ? 'V kraťasech by Samovi byla v mrazu zima. Dej mu dlouhé kalhoty.'
      : o.boty !== 'zimni-boty' ? 'Do sněhu se hodí zimní boty, v jiných by Samovi byla zima na nohy.'
      : !o.hlava ? 'Bez čepice by Samovi byla zima na uši.'
      : !o.ruce ? 'Bez palčáků by Samovi zmrzly ruce.'
      : null,
  },
  prsi: {
    id: 'prsi', label: '🌧️ Prší', sky: '🌧️', temp: '12 °C', bg: '#cfdcea', ask: 'Venku prší. Obleč Sama ven!', done: 'Sam v dešti nezmokne.',
    check: (o) =>
      !o.destnik ? 'Když prší, Sam by bez deštníku zmokl.'
      : o.boty !== 'holinky' ? 'Do kaluží se hodí holínky, v jiných botách by měl Sam mokré nohy.'
      : !o.dolu ? 'V kraťasech by Samovi při 12 °C byla zima.'
      : !warmTop(o) ? 'Při 12 °C je v tričku zima. Dej Samovi mikinu, svetr nebo bundu.'
      : o.bunda === 'zimni-bunda' ? 'Zimní bunda je na déšť moc teplá. Stačí obyčejná bunda.'
      : null,
  },
  horko: {
    id: 'horko', label: '☀️ Horko', sky: '☀️', temp: '30 °C', bg: '#fdf0c8', ask: 'Je léto a pořádné horko. Obleč Sama ven!', done: 'Samovi je příjemně. A nezapomeň pít!',
    check: (o) =>
      o.bunda ? 'V bundě by Samovi bylo v horku strašné horko.'
      : o.vrsek === 'mikina' || o.vrsek === 'svetr' ? 'Mikina nebo svetr jsou na léto moc teplé. Stačí tričko.'
      : o.dolu ? 'V dlouhých kalhotách je v horku vedro. Kraťasy jsou lepší.'
      : o.hlava ? 'Zimní čepice v létě nepatří.'
      : o.krk ? 'Šála v horku nepatří, zahřívá.'
      : o.ruce ? 'Palčáky v létě nepotřebuješ.'
      : o.boty === 'zimni-boty' || o.boty === 'holinky' ? 'V takových botách by se nohy v horku zapotily. Sandály jsou lepší.'
      : null,
  },
  fouka: {
    id: 'fouka', label: '🌬️ Fouká', sky: '🌬️', temp: '10 °C', bg: '#dbe8ee', ask: 'Je podzim a hodně fouká. Obleč Sama ven!', done: 'Vítr teď Samovi nevadí.',
    check: (o) =>
      o.destnik ? 'V silném větru by se deštník obrátil naruby.'
      : !o.dolu ? 'Při 10 °C a ve větru by v kraťasech byla zima.'
      : !warmTop(o) ? 'Ve větru je v tričku zima. Dej Samovi mikinu, svetr nebo bundu.'
      : !o.boty ? 'V sandálech by byla zima na nohy. Vyber pevné boty.'
      : o.bunda === 'zimni-bunda' ? 'Zimní bunda je na podzim moc teplá.'
      : null,
  },
};
const ALL: WeatherId[] = ['prsi', 'snezi', 'horko', 'fouka'];

export function PrvoukaObleceni({ settings = {} }: { settings?: Record<string, any> }) {
  const free = settings.mode === 'volne';
  const chosen: WeatherId[] = (Array.isArray(settings.weather) && settings.weather.length ? settings.weather : ALL).filter((x: string) => (ALL as string[]).includes(x));
  const rounds = useMemo(() => (chosen.length ? chosen : ALL), [chosen.join()]);
  const [ri, setRi] = useState(0);
  const [outfit, setOutfit] = useState<Outfit>({});
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; hint?: string; info?: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [clean, setClean] = useState(0);
  const W = WEATHER[rounds[ri] ?? 'prsi'];

  const toggle = (it: Item) => setOutfit((o) => ({ ...o, [it.slot]: o[it.slot] === it.id ? undefined : it.id }));
  const goOut = () => {
    const problem = W.check(outfit);
    if (problem) { setMistakes((m) => m + 1); setFeedback({ isCorrect: false, hint: problem }); return; }
    if (mistakes === 0) setClean((c) => c + 1);
    setFeedback({ isCorrect: true, info: W.done });
  };
  const afterFeedback = () => {
    const ok = feedback?.isCorrect;
    setFeedback(null);
    if (!ok) return;
    if (ri + 1 >= rounds.length) setFinished(true);
    else { setRi((x) => x + 1); setOutfit({}); setMistakes(0); }
  };
  const restart = () => { setFinished(false); setClean(0); setRi(0); setOutfit({}); setMistakes(0); };

  const worn = (Object.values(outfit).filter(Boolean) as string[]).map((id) => BY_ID[id]);

  return (
    <div className="w-full min-h-full flex flex-col items-center gap-3 p-3 md:p-5" style={{ background: '#e3eefc' }}>
      <h2 className="text-xl md:text-3xl font-bold text-center" style={{ color: INK }}>{free ? 'Obleč Sama, jak se ti líbí!' : W.ask}</h2>
      <div className="w-full max-w-6xl flex-1 grid gap-4 md:grid-cols-[minmax(260px,1fr)_minmax(320px,1.4fr)] items-start">
        {/* Sam a počasí */}
        <div className="relative rounded-3xl overflow-hidden flex flex-col items-center" style={{ background: free ? '#eef3fb' : W.bg, border: `2px solid ${INK}22` }}>
          {!free ? (
            <div className="absolute left-4 top-3 flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-1.5" style={{ color: INK }}>
              <span className="text-3xl leading-none">{W.sky}</span>
              <span className="text-base md:text-lg font-bold">{W.temp}</span>
            </div>
          ) : null}
          <div className="relative mt-16 mb-4" style={{ width: 'min(52%, 210px)', aspectRatio: `${SAM_W} / ${SAM_H}` }}>
            <img src={`${ART}/sam.png`} alt="Sam" className="absolute inset-0 w-full h-full" draggable={false} />
            {worn.flatMap((it) => it.pieces.map((p, i) => {
              const [x0, y0, x1, y1] = p.box;
              return (
                <img key={it.id + i} src={`${ART}/${p.src}.png`} alt="" draggable={false} className="absolute"
                  style={{ left: `${(x0 / SAM_W) * 100}%`, top: `${(y0 / SAM_H) * 100}%`, width: `${((x1 - x0) / SAM_W) * 100}%`, height: `${((y1 - y0) / SAM_H) * 100}%`, zIndex: p.z, animation: 'oblIn .3s ease' }} />
              );
            }))}
          </div>
          <div className="flex gap-2 pb-4">
            <button type="button" onClick={() => setOutfit({})} className="h-11 px-4 rounded-full bg-white text-sm font-bold" style={{ color: INK, border: `2px solid ${INK}` }}>Svléknout</button>
            {!free ? (
              <button type="button" onClick={goOut} className="h-11 px-6 rounded-full text-base font-bold text-white shadow" style={{ background: '#4f46e5' }}>Jdeme ven! →</button>
            ) : null}
          </div>
        </div>
        {/* Šatník */}
        <div className="flex flex-col gap-3">
          {SHELVES.map((sh) => (
            <div key={sh.title} className="rounded-2xl bg-white/70 p-2.5" style={{ border: `2px solid ${INK}1a` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#56628a' }}>{sh.title}</p>
              <div className="flex flex-wrap gap-2">
                {ITEMS.filter((it) => sh.slots.includes(it.slot)).map((it) => {
                  const on = outfit[it.slot] === it.id;
                  return (
                    <button key={it.id} type="button" onClick={() => toggle(it)} aria-pressed={on}
                      className="flex flex-col items-center justify-end gap-0.5 rounded-xl bg-white w-[84px] h-[92px] p-1.5 transition-transform hover:-translate-y-0.5"
                      style={{ border: `2px solid ${on ? '#4f46e5' : '#d6def0'}`, boxShadow: on ? '0 0 0 3px #c7c4ff' : 'none' }}>
                      <img src={`${ART}/${it.thumb}.png`} alt="" className="max-h-[56px] max-w-[70px] object-contain" draggable={false} />
                      <span className="text-[11px] font-bold leading-tight text-center" style={{ color: INK }}>{it.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs leading-snug" style={{ color: '#56628a' }}>
            Když v nějaké části nic nevybereš, má Sam svoje {Object.values(BASE).join(', ')}.
          </p>
        </div>
      </div>
      {!free ? <PrvoukaProgress current={ri} total={rounds.length} lives={0} maxLives={0} /> : null}
      <style>{'@keyframes oblIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}'}</style>
      {feedback ? <PrvoukaFeedbackOverlay isCorrect={feedback.isCorrect} hint={feedback.hint} info={feedback.info} onComplete={afterFeedback} /> : null}
      {finished ? <GameResultScreen isSuccess onContinue={restart} successText="Oblečeno! 👕" showContinueButton displayType="gameComplete" score={{ correct: clean, total: rounds.length }} /> : null}
    </div>
  );
}
