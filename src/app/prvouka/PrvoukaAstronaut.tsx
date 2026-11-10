import React, { useEffect, useMemo, useState } from 'react';
import { GameResultScreen } from '../components/GameResultScreen';
import { PrvoukaFeedbackOverlay, PrvoukaProgress } from './PrvoukaKit';

/**
 * Výlet do vesmíru (3. ročník, podmínky života).
 * Dítě stojí na Měsíci nebo na Marsu a vybírá, co si vezme. Správné věci se mu hned oblékají
 * (oblek, boty, rukavice, batoh se vzduchem, helma) a ke každé se ukáže, proč ji potřebuje.
 * Nevhodné věci (deštník, plavky…) vrátí ZKUS ZNOVU s vysvětlením. Nic morbidního – jen „tohle tu nepotřebuješ“.
 * Styl kresby jako postavičky v sešitu: bílá výplň, tenké tmavě modré čáry od ruky.
 */

type Place = 'mesic' | 'mars';
type Gear = 'oblek' | 'boty' | 'rukavice' | 'batoh' | 'helma';
type Decoy = 'destnik' | 'plavky' | 'ksiltovka' | 'zabky';
type Item = Gear | Decoy;

const GEAR: Gear[] = ['oblek', 'boty', 'rukavice', 'batoh', 'helma'];
const DECOYS: Decoy[] = ['destnik', 'plavky', 'ksiltovka', 'zabky'];
const NAME: Record<Item, string> = {
  oblek: 'Skafandr', boty: 'Pevné boty', rukavice: 'Rukavice', batoh: 'Batoh se vzduchem', helma: 'Helma',
  destnik: 'Deštník', plavky: 'Plavky', ksiltovka: 'Kšiltovka', zabky: 'Žabky',
};
const PLACE: Record<Place, { name: string; to: string; on: string }> = {
  mesic: { name: 'Měsíc', to: 'na Měsíc', on: 'na Měsíci' },
  mars: { name: 'Mars', to: 'na Mars', on: 'na Marsu' },
};
/** Proč tu věc potřebuješ – ukáže se, když si ji dítě vezme. */
const WHY: Record<Place, Record<Gear, string>> = {
  mesic: {
    oblek: 'Skafandr tě chrání před velkým horkem i velkou zimou.',
    boty: 'Pevné boty: všude je prach a ostré kamínky.',
    rukavice: 'Rukavice chrání ruce před mrazem, horkem a kamínky.',
    batoh: 'Z batohu proudí vzduch do helmy.',
    helma: 'Na Měsíci není vzduch. V helmě máš vzduch k dýchání.',
  },
  mars: {
    oblek: 'Skafandr tě chrání před velkou zimou.',
    boty: 'Pevné boty: všude je písek a kameny.',
    rukavice: 'Rukavice chrání ruce před mrazem a kameny.',
    batoh: 'Z batohu proudí vzduch do helmy.',
    helma: 'Na Marsu je vzduchu málo a nedá se jím dýchat. V helmě máš vzduch k dýchání.',
  },
};
const NOPE: Record<Place, Record<Decoy, string>> = {
  mesic: {
    destnik: 'Na Měsíci nikdy neprší, deštník nepotřebuješ.',
    plavky: 'Na Měsíci není žádná voda na koupání.',
    ksiltovka: 'Kšiltovka nestačí. Potřebuješ helmu se vzduchem.',
    zabky: 'V žabkách bys po ostrých kamíncích nedošel.',
  },
  mars: {
    destnik: 'Na Marsu neprší, deštník nepotřebuješ.',
    plavky: 'Na Marsu nejsou moře ani řeky na koupání.',
    ksiltovka: 'Kšiltovka nestačí. Potřebuješ helmu se vzduchem.',
    zabky: 'V žabkách bys po kamenech a v mrazu nedošel.',
  },
};

const INK = '#2a3a8c';
const BLUE = '#2f45a8';

function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export function PrvoukaAstronaut({ settings = {} }: { settings?: Record<string, any> }) {
  const places: Place[] = (Array.isArray(settings.places) && settings.places.length ? settings.places : ['mesic', 'mars']).filter((p: string) => p === 'mesic' || p === 'mars');
  const withDecoys = settings.decoys !== false;
  const [round, setRound] = useState(0);
  const [worn, setWorn] = useState<Gear[]>([]);
  const [tried, setTried] = useState<Decoy[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; hint?: string; info?: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [clean, setClean] = useState(0);
  const place = places[round] ?? 'mesic';
  const items = useMemo<Item[]>(() => shuffle([...GEAR, ...(withDecoys ? DECOYS : [])]), [round, withDecoys]);
  const done = worn.length === GEAR.length;

  useEffect(() => { setWorn([]); setTried([]); setNote(null); setMistakes(0); }, [round]);

  const pick = (it: Item) => {
    if (feedback || done) return;
    if ((GEAR as Item[]).includes(it)) {
      const g = it as Gear;
      if (worn.includes(g)) return;
      const next = [...worn, g];
      setWorn(next);
      setNote(`${NAME[g]}: ${WHY[place][g]}`);
      if (next.length === GEAR.length) {
        if (mistakes === 0) setClean((c) => c + 1);
        window.setTimeout(() => setFeedback({ isCorrect: true, info: `Máš všechno! Teď můžeš vystoupit ${PLACE[place].to}.` }), 700);
      }
    } else {
      const d = it as Decoy;
      if (!tried.includes(d)) setTried((t) => [...t, d]);
      setMistakes((m) => m + 1);
      setFeedback({ isCorrect: false, hint: NOPE[place][d] });
    }
  };

  const afterFeedback = () => {
    const wasDone = feedback?.isCorrect;
    setFeedback(null);
    if (!wasDone) return;
    if (round + 1 >= places.length) setFinished(true);
    else setRound((r) => r + 1);
  };

  const restart = () => { setFinished(false); setClean(0); setRound(0); setWorn([]); setTried([]); setNote(null); };

  return (
    <div className="w-full min-h-full flex flex-col items-center gap-3 p-3 md:p-5" style={{ background: '#e3eefc' }}>
      <h2 className="text-xl md:text-3xl font-bold text-center" style={{ color: INK }}>
        Letíš {PLACE[place].to}. Co si vezmeš?
      </h2>
      <div className="w-full max-w-5xl flex-1 grid gap-4 md:grid-cols-[1fr_minmax(280px,400px)] items-start">
        {/* Scéna s dítětem */}
        <div className="relative rounded-3xl overflow-hidden bg-white" style={{ border: `2px solid ${INK}22` }}>
          <Scene place={place} worn={worn} />
          {note ? (
            <p key={note} className="absolute left-3 right-3 bottom-3 rounded-2xl px-4 py-2.5 text-sm md:text-base font-bold leading-snug bg-white" style={{ color: INK, border: `2px solid ${INK}`, animation: 'astIn .4s ease' }}>
              {note}
            </p>
          ) : null}
        </div>
        {/* Nabídka věcí */}
        <div className="grid grid-cols-3 gap-2.5">
          {items.map((it) => {
            const isGear = (GEAR as Item[]).includes(it);
            const used = isGear ? worn.includes(it as Gear) : tried.includes(it as Decoy);
            return (
              <button
                key={it}
                type="button"
                disabled={used}
                onClick={() => pick(it)}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white p-2 pb-2.5 transition-transform hover:-translate-y-0.5 disabled:hover:translate-y-0"
                style={{ border: `2px solid ${used ? (isGear ? '#4CAF50' : '#FF4D6D') : INK}`, opacity: used ? 0.45 : 1 }}
              >
                <ItemIcon item={it} />
                <span className="text-xs md:text-sm font-bold leading-tight text-center" style={{ color: INK }}>{NAME[it]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <PrvoukaProgress current={round + (done ? 1 : 0)} total={places.length} lives={3} maxLives={0} />
      <style>{'@keyframes astIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'}</style>
      {feedback ? <PrvoukaFeedbackOverlay isCorrect={feedback.isCorrect} hint={feedback.hint} info={feedback.info} onComplete={afterFeedback} /> : null}
      {finished ? (
        <GameResultScreen isSuccess onContinue={restart} successText="Astronaut! 🚀" showContinueButton displayType="gameComplete" score={{ correct: clean, total: places.length }} />
      ) : null}
    </div>
  );
}

/** Krajina (Měsíc / Mars) a dítě, na kterém je vidět, co už má na sobě. */
function Scene({ place, worn }: { place: Place; worn: Gear[] }) {
  const has = (g: Gear) => worn.includes(g);
  const ground = place === 'mars' ? '#f7dccb' : '#f1f2f7';
  return (
    <svg viewBox="0 0 400 420" className="w-full h-auto block" role="img" aria-label={`Dítě ${PLACE[place].on}`}>
      <defs>
        <filter id="ast-ruka" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="2.4" />
        </filter>
      </defs>
      <rect width="400" height="420" fill="#1b2560" />
      {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity=".85" />)}
      <g filter="url(#ast-ruka)" fill="#ffffff" stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* Země na obloze */}
        <circle cx="330" cy="70" r="28" fill="#4a8fe0" stroke="#ffffff" />
        <path d="M312 60 Q322 50 334 58 Q332 70 320 72 Z M336 78 Q346 74 350 84 Q342 92 334 88 Z" fill="#5fae4f" stroke="none" />
        <text x="330" y="118" fontSize="14" fontWeight="700" fill="#ffffff" stroke="none" textAnchor="middle" style={{ fontFamily: 'VisbyRound, system-ui, sans-serif' }}>Země</text>
        {/* povrch s krátery */}
        <path d={`M-10 430 L-10 352 Q110 322 220 340 Q320 326 410 350 L410 430 Z`} fill={ground} />
        <ellipse cx="60" cy="380" rx="26" ry="7" fill="none" strokeWidth="1.6" />
        <ellipse cx="320" cy="392" rx="34" ry="8" fill="none" strokeWidth="1.6" />
        <ellipse cx="250" cy="366" rx="14" ry="4" fill="none" strokeWidth="1.4" />
        <path d="M30 352 l6 -3 M360 352 l-5 -4" fill="none" strokeWidth="1.4" />
        <text x="24" y="412" fontSize="15" fontWeight="700" fill={INK} stroke="none" style={{ fontFamily: 'VisbyRound, system-ui, sans-serif' }}>{PLACE[place].name}</text>
        {/* dítě */}
        <g transform="translate(100 20)">
          <Kid has={has} />
        </g>
      </g>
    </svg>
  );
}

/** Dítě a výbava ve vrstvách: batoh za zády, pak dítě, oblek, boty, rukavice, helma. */
function Kid({ has }: { has: (g: Gear) => boolean }) {
  return (
    <>
      <ellipse cx="100" cy="360" rx="58" ry="6" fill="rgba(42,58,140,.15)" stroke="none" />
      {has('batoh') ? (
        <g>
          <rect x="42" y="140" width="116" height="110" rx="18" />
          <path d="M52 150 L52 238 M148 150 L148 238" fill="none" strokeWidth="1.4" />
          <rect x="50" y="128" width="22" height="18" rx="6" fill="#f0a12c" />
          <rect x="128" y="128" width="22" height="18" rx="6" fill="#f0a12c" />
        </g>
      ) : null}
      {/* dítě bez výbavy */}
      <path d="M68 262 Q64 316 66 346 Q66 356 78 356 L96 356 Q98 350 94 344 L96 264" />
      <path d="M132 262 Q136 316 134 346 Q134 356 122 356 L104 356 Q102 350 106 344 L104 264" />
      <path d="M58 214 L142 214 L148 278 L106 282 L100 262 L94 282 L52 278 Z" fill={BLUE} />
      <path d="M52 152 Q58 126 100 122 Q142 126 148 152 L160 192 L138 200 L138 222 L62 222 L62 200 L40 192 Z" fill={BLUE} />
      <path d="M42 192 Q36 222 40 248 Q42 262 54 260 Q64 258 62 246 L62 200" />
      <path d="M158 192 Q164 222 160 248 Q158 262 146 260 Q136 258 138 246 L138 200" />
      <path d="M88 106 L88 126 Q100 132 112 126 L112 106" />
      <path d="M62 66 Q52 42 70 30 Q70 12 92 14 Q102 2 118 12 Q138 10 138 32 Q152 44 138 66 Q142 98 118 110 Q100 118 82 110 Q58 98 62 66 Z" />
      <path d="M74 40 Q84 32 94 40 M108 28 Q120 26 126 36 M86 22 Q92 18 98 22" fill="none" strokeWidth="1.6" />
      {has('oblek') ? (
        <g>
          <path d="M64 260 Q60 306 62 340 L98 340 L100 264" />
          <path d="M136 260 Q140 306 138 340 L102 340 L100 264" />
          <path d="M64 300 Q80 304 98 301 M136 300 Q120 304 102 301" fill="none" strokeWidth="1.6" />
          <path d="M50 150 Q32 196 36 250 L64 252 L68 196" />
          <path d="M150 150 Q168 196 164 250 L136 252 L132 196" />
          <path d="M37 226 Q50 230 64 228 M163 226 Q150 230 136 228" fill="none" strokeWidth="1.6" />
          <path d="M50 150 Q56 128 82 124 L118 124 Q144 128 150 150 L148 286 L52 286 Z" />
          <path d="M100 136 L100 168 M62 266 Q100 272 138 266" fill="none" strokeWidth="1.4" />
          <rect x="76" y="176" width="48" height="34" rx="7" />
          <circle cx="90" cy="193" r="5" fill={BLUE} /><circle cx="108" cy="193" r="5" />
          <path d="M118 184 l0 18" fill="none" strokeWidth="1.6" />
        </g>
      ) : null}
      {has('boty') ? (
        <g>
          <path d="M56 352 Q56 326 78 326 L98 326 L98 358 L60 358 Q56 358 56 352 Z" fill={BLUE} />
          <path d="M144 352 Q144 326 122 326 L102 326 L102 358 L140 358 Q144 358 144 352 Z" fill={BLUE} />
        </g>
      ) : null}
      {has('rukavice') ? (
        <g>
          <path d="M34 248 Q32 272 50 272 Q66 270 64 250 Z" fill={BLUE} />
          <path d="M166 248 Q168 272 150 272 Q134 270 136 250 Z" fill={BLUE} />
        </g>
      ) : null}
      {has('helma') ? (
        <g>
          <ellipse cx="100" cy="128" rx="48" ry="10" />
          <circle cx="100" cy="68" r="64" fill="rgba(255,255,255,.96)" />
          <path d="M56 64 Q56 32 100 30 Q144 32 144 64 Q144 102 100 104 Q56 102 56 64 Z" fill={BLUE} />
          <path d="M72 50 Q80 40 98 40 M70 66 Q70 62 72 58" fill="none" stroke="#ffffff" strokeWidth="3" />
          <path d="M150 44 Q160 66 152 94" fill="none" strokeWidth="1.4" />
        </g>
      ) : null}
    </>
  );
}

/** Malé obrázky věcí do nabídky, stejný styl čar. */
function ItemIcon({ item }: { item: Item }) {
  const p = { fill: '#ffffff', stroke: INK, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12 md:w-14 md:h-14" aria-hidden="true">
      <g {...p}>
        {item === 'helma' ? (<><circle cx="32" cy="30" r="22" /><path d="M16 28 Q16 14 32 13 Q48 14 48 28 Q48 42 32 43 Q16 42 16 28 Z" fill={BLUE} /><path d="M22 22 Q26 17 32 17" stroke="#fff" fill="none" /><path d="M14 52 Q32 46 50 52" fill="none" /></>) : null}
        {item === 'oblek' ? (<><path d="M18 14 Q22 8 32 8 Q42 8 46 14 L54 36 L46 38 L44 26 L44 56 L20 56 L20 26 L18 38 L10 36 Z" /><rect x="25" y="22" width="14" height="10" rx="2" /><circle cx="29" cy="27" r="1.8" fill={BLUE} stroke="none" /></>) : null}
        {item === 'batoh' ? (<><rect x="14" y="14" width="36" height="40" rx="8" /><rect x="18" y="8" width="9" height="8" rx="2" fill="#f0a12c" /><rect x="37" y="8" width="9" height="8" rx="2" fill="#f0a12c" /><path d="M22 26 L22 46 M42 26 L42 46" fill="none" strokeWidth="1.6" /></>) : null}
        {item === 'rukavice' ? (<path d="M20 52 L20 30 Q20 24 25 24 L25 14 Q25 10 29 10 Q33 10 33 14 L33 12 Q33 8 37 8 Q41 8 41 12 L41 16 Q45 14 47 18 L47 36 Q47 46 40 52 Z" fill={BLUE} />) : null}
        {item === 'boty' ? (<><path d="M14 18 L32 18 L32 38 L50 42 Q54 44 54 50 L54 54 L12 54 Q10 54 10 50 Z" fill={BLUE} /><path d="M12 48 L54 48" stroke="#fff" fill="none" strokeWidth="1.6" /></>) : null}
        {item === 'destnik' ? (<><path d="M8 32 Q8 10 32 10 Q56 10 56 32 Q50 28 44 32 Q38 28 32 32 Q26 28 20 32 Q14 28 8 32 Z" fill="#e0685a" /><path d="M32 32 L32 52 Q32 58 26 56" fill="none" /></>) : null}
        {item === 'plavky' ? (<path d="M10 18 L54 18 L52 44 L38 46 L32 32 L26 46 L12 44 Z" fill="#4a8fe0" />) : null}
        {item === 'ksiltovka' ? (<><path d="M14 38 Q14 16 34 16 Q50 18 50 38 Z" fill="#e0685a" /><path d="M10 38 L58 38 Q60 44 52 44 L10 44 Z" fill="#e0685a" /></>) : null}
        {item === 'zabky' ? (<><path d="M14 54 Q8 30 18 14 Q26 8 30 18 Q34 40 26 54 Z" fill="#f0a12c" /><path d="M38 54 Q34 34 42 18 Q50 10 54 22 Q56 42 48 54 Z" fill="#f0a12c" /><path d="M16 32 L22 24 L28 32 M40 32 L46 24 L52 32" fill="none" /></>) : null}
      </g>
    </svg>
  );
}

const STARS: Array<[number, number, number]> = [[30, 40, 1.6], [80, 90, 1.2], [140, 30, 1.8], [200, 70, 1.2], [250, 22, 1.4], [380, 140, 1.3], [40, 180, 1.2], [370, 230, 1.6], [20, 280, 1.2], [270, 160, 1.1], [180, 150, 1], [110, 200, 1.1]];
