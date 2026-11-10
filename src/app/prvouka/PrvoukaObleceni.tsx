import React, { useEffect, useMemo, useState } from 'react';
import { GameResultScreen } from '../components/GameResultScreen';
import { PrvoukaFeedbackOverlay, PrvoukaProgress } from './PrvoukaKit';

/**
 * Oblékni se podle počasí (Orientace v čase). Venku prší, sněží, je horko nebo fouká –
 * dítě vybírá, co si Sam oblékne. Správné věci si Sam vezme a ukáže se proč; nevhodné vrátí
 * vlídné vysvětlení. Na konci může být bonusové kolo „Výlet na Měsíc“ (skafandr).
 *
 * Ilustrace: Sam a díly skafandru jsou z obrázku od autorky (public/prvouka/ill/astronaut/dily).
 * Oblečení na počasí zatím nemá vlastní obrázky – v nabídce jsou jen ikonky a na Samovi se ukáže
 * jako štítek vedle něj. Až budou obrázky oblečení, doplní se do WEAR_ART stejně jako skafandr.
 */

const INK = '#2a3a8c';
const ART = `${import.meta.env.BASE_URL}prvouka/ill/astronaut/dily`;

type RoundId = 'prsi' | 'snezi' | 'horko' | 'fouka' | 'mesic';
interface Thing { id: string; name: string; icon: string; ok: boolean; why: string }
interface Round { id: RoundId; label: string; sky: string; temp: string; ask: string; bg: string; done: string; things: Thing[] }

const ROUNDS: Record<RoundId, Round> = {
  prsi: {
    id: 'prsi', label: '🌧️ Prší', sky: '🌧️', temp: '12 °C', bg: '#cfdcea', ask: 'Venku prší. Co si Sam vezme?',
    done: 'Hotovo! V dešti teď Sam nezmokne.',
    things: [
      { id: 'plastenka', name: 'Pláštěnka', icon: '🧥', ok: true, why: 'Pláštěnka nepropustí vodu, Sam nezmokne.' },
      { id: 'holinky', name: 'Holínky', icon: '🥾', ok: true, why: 'Holínky: v kalužích nebudou mokré nohy.' },
      { id: 'destnik', name: 'Deštník', icon: '☂️', ok: true, why: 'Pod deštníkem je sucho.' },
      { id: 'kratasy', name: 'Kraťasy', icon: '🩳', ok: false, why: 'V dešti a při 12 °C by v kraťasech byla zima.' },
      { id: 'bryle', name: 'Sluneční brýle', icon: '🕶️', ok: false, why: 'Když prší, slunce nesvítí. Brýle nejsou potřeba.' },
      { id: 'zabky', name: 'Žabky', icon: '🩴', ok: false, why: 'V žabkách by měl Sam v kalužích mokré nohy.' },
    ],
  },
  snezi: {
    id: 'snezi', label: '❄️ Sněží', sky: '🌨️', temp: '−5 °C', bg: '#e6eef8', ask: 'Venku sněží a mrzne. Co si Sam vezme?',
    done: 'Hotovo! Teď může Sam stavět sněhuláka.',
    things: [
      { id: 'bunda', name: 'Zimní bunda', icon: '🧥', ok: true, why: 'Zimní bunda hřeje.' },
      { id: 'sala', name: 'Šála', icon: '🧣', ok: true, why: 'Šála zahřeje krk.' },
      { id: 'rukavice', name: 'Rukavice', icon: '🧤', ok: true, why: 'V rukavicích nezmrznou ruce.' },
      { id: 'boty', name: 'Zimní boty', icon: '🥾', ok: true, why: 'Zimní boty: nohy zůstanou v teple a suché.' },
      { id: 'kratasy', name: 'Kraťasy', icon: '🩳', ok: false, why: 'V mrazu by v kraťasech byla velká zima.' },
      { id: 'kraksiltovka', name: 'Kšiltovka', icon: '🧢', ok: false, why: 'Kšiltovka nezahřeje uši. Radši čepici.' },
      { id: 'sandaly', name: 'Sandály', icon: '👡', ok: false, why: 'Do sněhu se sandály nehodí, nohy by zmrzly.' },
    ],
  },
  horko: {
    id: 'horko', label: '☀️ Horko', sky: '☀️', temp: '30 °C', bg: '#fdf0c8', ask: 'Je léto a pořádné horko. Co si Sam vezme?',
    done: 'Hotovo! Teď je Samovi příjemně. A nezapomeň pít!',
    things: [
      { id: 'kratasy', name: 'Kraťasy', icon: '🩳', ok: true, why: 'V kraťasech není takové horko.' },
      { id: 'ksiltovka', name: 'Kšiltovka', icon: '🧢', ok: true, why: 'Kšiltovka chrání hlavu před sluncem.' },
      { id: 'bryle', name: 'Sluneční brýle', icon: '🕶️', ok: true, why: 'Brýle chrání oči před ostrým sluncem.' },
      { id: 'sandaly', name: 'Sandály', icon: '👡', ok: true, why: 'V sandálech se nohy nezapotí.' },
      { id: 'bunda', name: 'Zimní bunda', icon: '🧥', ok: false, why: 'V zimní bundě by bylo v létě strašné horko.' },
      { id: 'sala', name: 'Šála', icon: '🧣', ok: false, why: 'Šála v horku nepatří, zahřívá.' },
      { id: 'rukavice', name: 'Rukavice', icon: '🧤', ok: false, why: 'Rukavice v létě nepotřebuješ.' },
    ],
  },
  fouka: {
    id: 'fouka', label: '🌬️ Fouká', sky: '🌬️', temp: '10 °C', bg: '#dbe8ee', ask: 'Venku je podzim a hodně fouká. Co si Sam vezme?',
    done: 'Hotovo! Vítr teď Samovi nevadí.',
    things: [
      { id: 'bunda', name: 'Bunda', icon: '🧥', ok: true, why: 'Bunda nepropustí vítr.' },
      { id: 'kalhoty', name: 'Dlouhé kalhoty', icon: '👖', ok: true, why: 'V dlouhých kalhotách nebude zima na nohy.' },
      { id: 'boty', name: 'Pevné boty', icon: '👟', ok: true, why: 'Pevné boty na procházku listím.' },
      { id: 'destnik', name: 'Deštník', icon: '☂️', ok: false, why: 'V silném větru by se deštník obrátil naruby.' },
      { id: 'kratasy', name: 'Kraťasy', icon: '🩳', ok: false, why: 'Při 10 °C a ve větru by v kraťasech byla zima.' },
      { id: 'zabky', name: 'Žabky', icon: '🩴', ok: false, why: 'V žabkách by na podzim byla zima na nohy.' },
    ],
  },
  mesic: {
    id: 'mesic', label: '🚀 Výlet na Měsíc', sky: '🌕', temp: 've dne +120 °C, v noci −170 °C', bg: '#1b2560', ask: 'Bonus: letíš na Měsíc! Co si Sam vezme?',
    done: 'Hotovo! Teď může Sam vystoupit na Měsíc.',
    things: [
      { id: 'kalhoty', name: 'Kalhoty skafandru', icon: '👖', ok: true, why: 'Skafandr chrání před velkým horkem i zimou.' },
      { id: 'bunda', name: 'Bunda skafandru', icon: '🧥', ok: true, why: 'Skafandr chrání před velkým horkem i zimou.' },
      { id: 'boty', name: 'Boty', icon: '🥾', ok: true, why: 'Pevné boty: všude je prach a ostré kamínky.' },
      { id: 'rukavice', name: 'Rukavice', icon: '🧤', ok: true, why: 'Rukavice chrání ruce před mrazem i horkem.' },
      { id: 'helma', name: 'Helma', icon: '🪖', ok: true, why: 'Na Měsíci není vzduch. V helmě máš vzduch k dýchání.' },
      { id: 'destnik', name: 'Deštník', icon: '☂️', ok: false, why: 'Na Měsíci nikdy neprší.' },
      { id: 'plavky', name: 'Plavky', icon: '🩱', ok: false, why: 'Na Měsíci není žádná voda na koupání.' },
    ],
  },
};
const ALL: RoundId[] = ['prsi', 'snezi', 'horko', 'fouka', 'mesic'];

/** Obrázky, které se Samovi opravdu oblékají (pozice v % jeho obrázku 460 × 985). Zatím jen skafandr. */
const WEAR_ART: Partial<Record<RoundId, Record<string, Array<{ src: string; left: number; top: number; width: number; z: number }>>>> = {
  mesic: {
    kalhoty: [{ src: 'kalhoty.png', left: 80 / 460, top: 583 / 985, width: (340 * 0.92) / 460, z: 2 }],
    bunda: [{ src: 'bunda.png', left: 14 / 460, top: 368 / 985, width: (490 * 0.92) / 460, z: 3 }],
    boty: [
      { src: 'botaL.png', left: 52 / 460, top: 790 / 985, width: (200 * 0.85) / 460, z: 4 },
      { src: 'botaP.png', left: 248 / 460, top: 790 / 985, width: (200 * 0.85) / 460, z: 4 },
    ],
    rukavice: [
      { src: 'rukL.png', left: 30 / 460, top: 555 / 985, width: (167 * 0.6) / 460, z: 5 },
      { src: 'rukP.png', left: 342 / 460, top: 555 / 985, width: (167 * 0.6) / 460, z: 5 },
    ],
    helma: [{ src: 'helma.png', left: -26 / 460, top: -80 / 985, width: (380 * 1.3) / 460, z: 6 }],
  },
};

function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export function PrvoukaObleceni({ settings = {} }: { settings?: Record<string, any> }) {
  const chosen: RoundId[] = (Array.isArray(settings.weather) && settings.weather.length ? settings.weather : ['prsi', 'snezi', 'horko', 'fouka'])
    .filter((x: string) => (ALL as string[]).includes(x));
  const rounds = chosen.length ? chosen : ['prsi'] as RoundId[];
  const [ri, setRi] = useState(0);
  const [worn, setWorn] = useState<string[]>([]);
  const [tried, setTried] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; hint?: string; info?: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [clean, setClean] = useState(0);
  const R = ROUNDS[rounds[ri] ?? 'prsi'];
  const items = useMemo(() => shuffle(R.things), [R]);
  const need = R.things.filter((t) => t.ok).length;
  const done = worn.length === need;
  const space = R.id === 'mesic';

  useEffect(() => { setWorn([]); setTried([]); setNote(null); setMistakes(0); }, [ri]);

  const pick = (t: Thing) => {
    if (feedback || done) return;
    if (t.ok) {
      if (worn.includes(t.id)) return;
      const next = [...worn, t.id];
      setWorn(next);
      setNote(t.why);
      if (next.length === need) {
        if (mistakes === 0) setClean((c) => c + 1);
        window.setTimeout(() => setFeedback({ isCorrect: true, info: R.done }), 700);
      }
    } else {
      if (!tried.includes(t.id)) setTried((x) => [...x, t.id]);
      setMistakes((m) => m + 1);
      setFeedback({ isCorrect: false, hint: t.why });
    }
  };
  const afterFeedback = () => {
    const ok = feedback?.isCorrect;
    setFeedback(null);
    if (!ok) return;
    if (ri + 1 >= rounds.length) setFinished(true); else setRi((x) => x + 1);
  };
  const restart = () => { setFinished(false); setClean(0); setRi(0); };
  const art = WEAR_ART[R.id] ?? {};
  const label = R.things.filter((t) => worn.includes(t.id) && !art[t.id]);

  return (
    <div className="w-full min-h-full flex flex-col items-center gap-3 p-3 md:p-5" style={{ background: '#e3eefc' }}>
      <h2 className="text-xl md:text-3xl font-bold text-center" style={{ color: INK }}>{R.ask}</h2>
      <div className="w-full max-w-5xl flex-1 grid gap-4 md:grid-cols-[1fr_minmax(280px,420px)] items-start">
        {/* Počasí a Sam */}
        <div className="relative rounded-3xl overflow-hidden" style={{ background: R.bg, border: `2px solid ${INK}22`, minHeight: 320 }}>
          <div className="absolute left-4 top-3 flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-1.5" style={{ color: INK }}>
            <span className="text-3xl leading-none">{R.sky}</span>
            <span className="text-base md:text-lg font-bold">{R.temp}</span>
          </div>
          {space ? <div className="absolute right-5 top-4 text-4xl" aria-hidden="true">🌍</div> : null}
          <div className="relative mx-auto pt-16 pb-14" style={{ width: 'min(58%, 230px)' }}>
            <div className="relative" style={{ aspectRatio: '460 / 985' }}>
              <img src={`${ART}/kid.png`} alt="Sam" className="absolute inset-0 w-full h-full" draggable={false} />
              {worn.flatMap((id) => (art[id] ?? []).map((a, i) => (
                <img key={id + i} src={`${ART}/${a.src}`} alt="" draggable={false} className="absolute h-auto"
                  style={{ left: `${a.left * 100}%`, top: `${a.top * 100}%`, width: `${a.width * 100}%`, zIndex: a.z, animation: 'oblIn .35s ease' }} />
              )))}
            </div>
          </div>
          {label.length ? (
            <div className="absolute right-3 top-16 flex flex-col gap-1.5">
              {label.map((t) => (
                <span key={t.id} className="rounded-full bg-white px-2.5 py-1 text-sm font-bold flex items-center gap-1.5" style={{ color: INK, border: `2px solid ${INK}`, animation: 'oblIn .35s ease' }}>
                  <span className="text-lg leading-none">{t.icon}</span>{t.name}
                </span>
              ))}
            </div>
          ) : null}
          {note ? (
            <p key={note} className="absolute left-3 right-3 bottom-3 rounded-2xl px-4 py-2.5 text-sm md:text-base font-bold leading-snug bg-white" style={{ color: INK, border: `2px solid ${INK}`, animation: 'oblIn .4s ease', zIndex: 10 }}>{note}</p>
          ) : null}
        </div>
        {/* Nabídka */}
        <div className="grid grid-cols-3 gap-2.5">
          {items.map((t) => {
            const used = t.ok ? worn.includes(t.id) : tried.includes(t.id);
            return (
              <button key={t.id} type="button" disabled={used} onClick={() => pick(t)}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2 pb-2.5 transition-transform hover:-translate-y-0.5 disabled:hover:translate-y-0"
                style={{ border: `2px solid ${used ? (t.ok ? '#4CAF50' : '#FF4D6D') : INK}`, opacity: used ? 0.45 : 1 }}>
                <span className="text-4xl md:text-5xl leading-none py-1" aria-hidden="true">{t.icon}</span>
                <span className="text-xs md:text-sm font-bold leading-tight text-center" style={{ color: INK }}>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <PrvoukaProgress current={ri + (done ? 1 : 0)} total={rounds.length} lives={0} maxLives={0} />
      <style>{'@keyframes oblIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}'}</style>
      {feedback ? <PrvoukaFeedbackOverlay isCorrect={feedback.isCorrect} hint={feedback.hint} info={feedback.info} onComplete={afterFeedback} /> : null}
      {finished ? <GameResultScreen isSuccess onContinue={restart} successText="Oblečeno! 👕" showContinueButton displayType="gameComplete" score={{ correct: clean, total: rounds.length }} /> : null}
    </div>
  );
}
