import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { canSpeak, speakCzech, stopSpeaking } from './data/speech';
import {
  MOON_PHASE_INFO,
  OTHER_BODIES,
  SPACE_PLANETS,
  SYNODIC,
  drawMoonOrbit,
  moonOrbitPointer,
  drawMoonSky,
  moonThumb,
  phaseIndex,
  prefersReducedMotion,
  todayMoonDay,
  type PlanetKey,
  type SpacePlanet,
  type Eclipse,
} from './space-engine';
import { SolarScene3D, yearsPerSecond, type DayPart, type SolarBodyId, type SolarStyle } from './solar-3d';

/**
 * Interaktivní modely 3. ročníku (Putování vesmírem, Schovaná v Mléčné dráze, Jediná obyvatelná):
 * Sluneční soustava a fáze Měsíce. Na rozdíl od kvízů nic nehodnotí – slouží k promítnutí
 * a k vysvětlování u tabule.
 */
export function PrvoukaSpaceModel({ model, settings }: { model: 'soustava' | 'mesic'; settings?: Record<string, any> }) {
  useEffect(() => () => stopSpeaking(), []);
  return model === 'soustava' ? <SolarModel settings={settings} /> : <MoonModel settings={settings} />;
}

/** Volný pruh dole pro tlačítka Všechny hry / Nastavení – jen když je aplikace ukazuje (hra spuštěná z rozcestníku). */
// Tlačítka Všechny hry / Nastavení jsou dole vlevo: na počítači uhne jen model vlevo (NAV_LEFT),
// panel vpravo jde až dolů. Na mobilu (pod sebou) uhne celá stránka.
const NAV_SPACE = 'pb-20 lg:pb-5';
const NAV_LEFT = 'lg:mb-16';
const PANEL = 'rounded-3xl bg-white text-[#0f1d4d] p-5 flex flex-col gap-3 min-w-0';
const SPACE_BUTTON = 'rounded-full px-4 py-2 text-sm 2xl:text-base font-bold border whitespace-nowrap transition-colors';
const planetIcon = (id: PlanetKey) => `${import.meta.env.BASE_URL}prvouka/tretak/planety/${id}.webp`;

function ReadButton({ text, iconOnly = false }: { text: string; iconOnly?: boolean }) {
  if (!canSpeak()) return null;
  if (iconOnly) {
    // Jen ikona reproduktoru – text vedle má víc místa.
    return (
      <button
        type="button"
        onClick={() => speakCzech(text)}
        aria-label="Přečíst"
        title="Přečíst"
        className="flex-shrink-0 w-10 h-10 rounded-full border border-[#d5dbeb] bg-[#f5f7fc] hover:bg-[#eef1f8] flex items-center justify-center text-[#0f1d4d] transition-colors"
      >
        <Volume2 size={20} />
      </button>
    );
  }
  return (
    <button type="button" onClick={() => speakCzech(text)} className="self-start inline-flex items-center gap-2 rounded-full border border-[#d5dbeb] bg-[#f5f7fc] px-4 py-2 font-bold">
      <Volume2 size={18} /> Přečíst
    </button>
  );
}

function SpaceButton({ pressed, onClick, children }: { pressed?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={SPACE_BUTTON}
      style={pressed ? { background: '#f0a12c', color: '#2a1700', borderColor: 'transparent' } : { background: 'rgba(255,255,255,.1)', color: '#e7ecff', borderColor: 'rgba(255,255,255,.2)' }}
    >
      {children}
    </button>
  );
}

/** Volba „jedna z několika“: jedna tmavá kapsle, vybraná část je oranžová. */
function SpaceSegmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
      <div className="flex rounded-full p-1" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)' }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className="rounded-full px-3 2xl:px-4 py-1.5 text-sm 2xl:text-base font-bold whitespace-nowrap transition-colors"
              style={active ? { background: '#f0a12c', color: '#2a1700' } : { background: 'transparent', color: '#e7ecff' }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Zapnout / vypnout: klasický vypínač s popiskem. */
function SpaceSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm 2xl:text-base font-bold text-[#e7ecff] whitespace-nowrap">
      <span className="relative inline-block w-11 h-6 rounded-full transition-colors" style={{ background: checked ? '#f0a12c' : 'rgba(255,255,255,.2)' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: checked ? 22 : 2 }} />
      </span>
      {label}
    </button>
  );
}

function czPlural(n: number, one: string, few: string, many: string) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

/**
 * Kolik času v modelu uběhne za 1 vteřinu (stejný výpočet jako v solar-3d, yearsPerSecond).
 * „1 s = 2 měsíce“ – dětem říká víc než holý posuvník.
 */
function speedLabel(speed: number) {
  const s = speed / 100;
  const days = yearsPerSecond(s) * 365.25;
  if (days < 0.75) return '1 s = půl dne';
  if (days < 28) {
    const d = Math.max(1, Math.round(days));
    return `1 s = ${d} ${czPlural(d, 'den', 'dny', 'dní')}`;
  }
  if (days < 350) {
    const m = Math.max(1, Math.round(days / 30.44));
    return `1 s = ${m} ${czPlural(m, 'měsíc', 'měsíce', 'měsíců')}`;
  }
  const y = Math.round((days / 365.25) * 10) / 10;
  if (y <= 1) return '1 s = 1 rok';
  return Number.isInteger(y) ? `1 s = ${y} ${czPlural(y, 'rok', 'roky', 'let')}` : `1 s = ${y.toLocaleString('cs-CZ')} roku`;
}

/** Pořadí v panelu: Slunce, planety od Slunce, pak Měsíc a kometa. */
const BODY_ORDER: SolarBodyId[] = ['slunce', ...SPACE_PLANETS.map((p) => p.id), 'mesic', 'kometa'];

/** Barvy kartiček planet – stejné odstíny jako dráhy v modelu, jen sytější, ať na nich je čitelný bílý text. */
const PLANET_CARD: Record<PlanetKey, string> = {
  merkur: '#8d8a85',
  venuse: '#c9a35e',
  zeme: '#3f86d8',
  mars: '#c4552d',
  jupiter: '#b9834d',
  saturn: '#c7a95c',
  uran: '#3fa5a8',
  neptun: '#3f5fd6',
};

/** Velikost planet v řadě přehledu – přibližně podle skutečnosti, ale ať jsou vidět i malé. */
// Skutečné poměry průměrů (poloměr v km, Jupiter = 78 px). Obrázek Saturnu a Uranu obsahuje
// i prstence, takže je širší než samotná koule (prstence sahají do 2,3× a 1,9× poloměru).
const REAL_RADIUS_KM: Record<PlanetKey, number> = { merkur: 2440, venuse: 6052, zeme: 6371, mars: 3390, jupiter: 69911, saturn: 58232, uran: 25362, neptun: 24622 };
const RING_FACTOR: Partial<Record<PlanetKey, number>> = { saturn: 2.3, uran: 1.9 };
// Vnitřní planety by byly ve skutečném poměru jen tečky – zvětšíme je, aby šly vidět (mezi sebou poměr drží).
const INNER_BOOST: Partial<Record<PlanetKey, number>> = { merkur: 2, venuse: 2, zeme: 2, mars: 2 };
const OVERVIEW_SIZE = Object.fromEntries(
  (Object.keys(REAL_RADIUS_KM) as PlanetKey[]).map((id) => [id, (REAL_RADIUS_KM[id] / 69911) * 78 * (RING_FACTOR[id] ?? 1) * (INNER_BOOST[id] ?? 1)]),
) as Record<PlanetKey, number>;

/** Barva popisku dlaždice: planety v barvě své dráhy, Slunce, Měsíc a kometa vlastní. */
const BODY_COLOR: Record<SolarBodyId, string> = { ...PLANET_CARD, slunce: '#d97a14', mesic: '#7d7b75', kometa: '#2f8fb8' };

const BODY_GROUPS: Array<{ title: string; ids: SolarBodyId[] }> = [
  { title: 'Hvězda', ids: ['slunce'] },
  { title: 'Planety', ids: SPACE_PLANETS.map((p) => p.id) },
  { title: 'Další tělesa', ids: ['mesic', 'kometa'] },
];

const HERO_STARS: Array<[number, number, number, string]> = [
  [8, 14, 3, '#fff'], [22, 70, 2, '#fff'], [88, 18, 4, '#fff'], [92, 62, 3, '#e05aa0'], [14, 44, 4, '#5b8cff'],
  [70, 8, 2, '#fff'], [80, 84, 3, '#5b8cff'], [36, 88, 2, '#fff'], [60, 30, 2, '#fff'], [5, 86, 3, '#e05aa0'],
];

function bodyName(id: SolarBodyId) {
  return SPACE_PLANETS.find((p) => p.id === id)?.name ?? OTHER_BODIES[id as keyof typeof OTHER_BODIES]?.name ?? '';
}

/** „Přiblížit Zemi / Mars / Slunce…“ – 4. pád. */
function bodyAccusative(id: SolarBodyId) {
  const map: Partial<Record<SolarBodyId, string>> = { zeme: 'Zemi', venuse: 'Venuši', slunce: 'Slunce', mesic: 'Měsíc', kometa: 'kometu' };
  return map[id] ?? bodyName(id);
}

function FactTile({ label, value, visual }: { label: string; value: string; visual?: React.ReactNode }) {
  return (
    // Tři pevné pruhy, ať jsou ve všech dlaždicích nadpisy, obrázky i hodnoty na stejné výšce:
    // nadpis má vždy místo na dva řádky, obrázek je vystředěný v pruhu stejné výšky, hodnota dole.
    <div className="rounded-xl bg-[#f4f6fb] px-2 py-2.5 text-center grid grid-rows-[2.1em_3.25rem_auto] items-center justify-items-center text-[11px]">
      <div className="self-start leading-tight text-[#56628a]">{label}</div>
      <div className="h-full w-full flex items-center justify-center">{visual}</div>
      <div className="self-end text-sm font-bold leading-tight">{value}</div>
    </div>
  );
}

/** Oběh: Slunce uprostřed, dráha a planeta v barvě planety. */
function OrbitIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 40" className="w-11 h-9" aria-hidden="true">
      <ellipse cx="24" cy="20" rx="20" ry="13" fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="24" cy="20" r="6" fill="#f7b733" />
      <circle cx="42" cy="15" r="4.5" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/** Velikost planety vedle Země ve skutečném poměru (větší z obou má 44 px). */
function SizeCompare({ planetId, ratio, src, earthSrc }: { planetId: PlanetKey; ratio: number; src?: string; earthSrc?: string }) {
  const max = 44;
  const pSize = ratio >= 1 ? max : Math.max(4, max * ratio);
  const eSize = ratio >= 1 ? Math.max(4, max / ratio) : max;
  if (planetId === 'zeme') return <img src={earthSrc ?? planetIcon('zeme')} alt="" style={{ width: 30, height: 30 }} className="object-contain" />;
  return (
    // O kousek výš, ať se velká planeta (Jupiter, Saturn) nedotýká dvouřádkové hodnoty pod ní.
    <span className="flex items-end gap-1.5 -translate-y-1.5">
      <img src={src ?? planetIcon(planetId)} alt="" style={{ width: pSize, height: pSize }} className="object-contain" />
      <span className="flex flex-col items-center">
        <img src={earthSrc ?? planetIcon('zeme')} alt="Země" style={{ width: eSize, height: eSize }} className="object-contain" />
      </span>
    </span>
  );
}

/** Velký obrázek tělesa v hlavičce panelu (planety z obrázků, Slunce, Měsíc a kometa nakreslené). */
function BodyImage({ id, size, src }: { id: SolarBodyId; size: number; src?: string }) {
  if (src) {
    return <img src={src} alt="" style={{ width: size, height: size }} className="object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />;
  }
  if (SPACE_PLANETS.some((p) => p.id === id)) {
    return <img src={planetIcon(id as PlanetKey)} alt="" style={{ width: size, height: size }} className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />;
  }
  if (id === 'slunce') {
    return <span className="rounded-full" style={{ width: size * 0.9, height: size * 0.9, background: 'radial-gradient(circle at 40% 38%, #fff3b0, #ffb732 45%, #f06a1a 100%)', boxShadow: '0 0 40px 10px rgba(255,170,40,.45)' }} />;
  }
  if (id === 'mesic') {
    return <span className="rounded-full" style={{ width: size * 0.7, height: size * 0.7, background: 'radial-gradient(circle at 38% 35%, #f2f1ec, #b9b7ae 60%, #85837c 100%)' }} />;
  }
  return (
    <span className="relative" style={{ width: size, height: size * 0.6 }}>
      <span className="absolute rounded-full" style={{ right: 0, top: '30%', width: size * 0.22, height: size * 0.22, background: 'radial-gradient(circle at 40% 40%, #fff, #bfe6ff)' }} />
      <span className="absolute" style={{ right: size * 0.15, top: '38%', width: size * 0.8, height: size * 0.08, borderRadius: 999, background: 'linear-gradient(270deg, rgba(191,230,255,.9), rgba(191,230,255,0))' }} />
    </span>
  );
}

/* ------------------------------------------------------------ Sluneční soustava */

function SolarModel({ settings }: { settings?: Record<string, any> }) {
  const still = useMemo(prefersReducedMotion, []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SolarScene3D | null>(null);
  const [playing, setPlaying] = useState(!still);
  const [speed, setSpeed] = useState(40);
  const [view, setView] = useState<'orbit' | 'size'>(settings?.view === 'size' ? 'size' : 'orbit');
  const [labels, setLabels] = useState(settings?.labels !== false);
  const [style, setStyle] = useState<SolarStyle>(settings?.style === 'kresleny' ? 'kresleny' : 'realny');
  const [selected, setSelected] = useState<SolarBodyId>('zeme');
  const [focused, setFocused] = useState(false);
  const [clock, setClock] = useState(formatYears(0));
  const [webglError, setWebglError] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // Den a noc: Země se točí kolem osy, značka „Tady jsme my“ ukazuje, jestli je u nás den, nebo noc.
  const [dayNight, setDayNight] = useState(false);
  const [dayPart, setDayPart] = useState<DayPart>('den');
  // Závod planet: všechny vyrazí ze startovní čáry, panel počítá oběhy.
  const [race, setRace] = useState(false);
  // Porovnej se Zemí: velký pohled planeta vedle Země ve skutečném poměru.
  const [compare, setCompare] = useState(false);
  // Porovnání ukazuje planety velké – malé obrázky z panelu by byly rozpixlované, tak se vykreslí ostřejší.
  const [compareThumbs, setCompareThumbs] = useState<Partial<Record<SolarBodyId, string>>>({});
  useEffect(() => {
    if (!compare) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const next: Partial<Record<SolarBodyId, string>> = {};
    for (const id of ['zeme', selected] as SolarBodyId[]) {
      const url = scene.thumbnail(id, 900);
      if (url) next[id] = url;
    }
    setCompareThumbs(next);
  }, [compare, selected, style]);
  const [laps, setLaps] = useState<Partial<Record<PlanetKey, number>>>({});
  const dayNightRef = useRef(false);
  dayNightRef.current = dayNight;
  // Obrázky do panelu „vyfocené“ z modelu v aktuálním vzhledu (opravdový / kreslený).
  const [thumbs, setThumbs] = useState<Partial<Record<SolarBodyId, string>>>({});
  const thumbTimer = useRef<number | undefined>(undefined);
  const refreshThumbs = () => {
    window.clearTimeout(thumbTimer.current);
    thumbTimer.current = window.setTimeout(() => {
      const scene = sceneRef.current;
      if (!scene) return;
      const next: Partial<Record<SolarBodyId, string>> = {};
      for (const id of BODY_ORDER) {
        if (id === 'kometa') continue;
        const url = scene.thumbnail(id, 320);
        if (url) next[id] = url;
      }
      setThumbs(next);
    }, 250);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let scene: SolarScene3D;
    let lastClock = '';
    try {
      scene = new SolarScene3D(containerRef.current, {
        view,
        labels,
        style,
        still,
        onSelect: (id) => { setRace(false); setCompare(false); setSelected(id); setFocused(true); },
        onYears: (years) => { const text = formatYears(years, dayNightRef.current); if (text !== lastClock) { lastClock = text; setClock(text); } },
        onDayPart: (part) => setDayPart(part),
        onRace: (l) => setLaps(l),
        onLook: () => refreshThumbs(),
      });
    } catch {
      setWebglError(true);
      return;
    }
    sceneRef.current = scene;
    refreshThumbs();
    return () => { window.clearTimeout(thumbTimer.current); scene.dispose(); sceneRef.current = null; };
    // Scéna se staví jednou; další změny jdou přes její metody.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setPlaying(playing); }, [playing]);
  useEffect(() => { sceneRef.current?.setSpeed(speed / 100); }, [speed]);
  useEffect(() => { sceneRef.current?.setLabels(labels); }, [labels]);
  useEffect(() => { sceneRef.current?.setStyle(style); }, [style]);
  useEffect(() => { sceneRef.current?.setView(view); setFocused(false); setDayNight(false); if (view !== 'orbit') setRace(false); }, [view]);
  useEffect(() => {
    sceneRef.current?.setRace(race);
    // Rychlost tak, aby Merkur oběhl za pár sekund a Země zhruba za 12 s (1 s = asi 1 měsíc).
    if (race) { setSpeed(56); setPlaying(true); setLaps({}); }
  }, [race]);
  useEffect(() => { sceneRef.current?.setDayNight(dayNight); if (dayNight) setPlaying(true); }, [dayNight]);

  const choose = (id: SolarBodyId) => {
    if (id !== 'zeme') setDayNight(false);
    setRace(false);
    setCompare(false);
    setSelected(id);
    setFocused(true);
    sceneRef.current?.select(id);
  };
  const overview = () => {
    setDayNight(false);
    setCompare(false);
    setFocused(false);
    sceneRef.current?.select(null);
  };
  const step = (dir: number) => {
    const i = BODY_ORDER.indexOf(selected);
    choose(BODY_ORDER[(i + dir + BODY_ORDER.length) % BODY_ORDER.length]);
  };

  const planet = SPACE_PLANETS.find((p) => p.id === selected);
  const other = OTHER_BODIES[selected as keyof typeof OTHER_BODIES];
  // Krátká nápověda je vidět vždy, delší vysvětlení až po klepnutí / najetí na „i“.
  const noteShort = view === 'orbit' ? 'Klepni na planetu' : 'Velikosti ve skutečném poměru';
  const note = view === 'orbit'
    ? 'Klepni na planetu – přiblíží se. Tažením otáčíš, kolečkem nebo dvěma prsty přibližuješ. Vzdálenosti jsou zmenšené: Neptun je ve skutečnosti 30× dál od Slunce než Země.'
    : 'Velikosti ve skutečném poměru. Do Slunce by se vešlo asi 1 300 000 Zemí, Jupiter je asi 11× širší než Země.';

  return (
    // Na počítači přesně na výšku okna: spodní pruh (pb-20) zůstane volný pro tlačítka
    // Všechny hry / Nastavení a lišta modelu pod ně nesjede. Delší panel roluje sám.
    <div className={`w-full min-h-[100svh] lg:h-[100svh] bg-[#eef1f8] p-3 md:p-5 ${settings ? NAV_SPACE : ''} grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,24vw)] lg:grid-rows-[minmax(0,1fr)]`}>
      <div ref={containerRef} className={`relative rounded-3xl overflow-hidden bg-[#04060f] min-h-[60svh] lg:min-h-0 ${settings ? NAV_LEFT : ''}`}>
        {webglError ? (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[#e7ecff] text-lg">Tenhle prohlížeč neumí 3D grafiku (WebGL). Zkus jiný prohlížeč nebo novější zařízení.</p>
        ) : null}
        <div className="group absolute top-3 left-4 z-20 max-w-[min(26rem,70%)]">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-bold text-[#e7ecff]">{noteShort}</span>
            <button
              type="button"
              onClick={() => setNoteOpen((v) => !v)}
              aria-label="Jak model ovládat"
              aria-expanded={noteOpen}
              className="w-6 h-6 rounded-full border border-white/40 text-[#e7ecff] text-xs font-bold flex items-center justify-center hover:bg-white/10"
            >
              i
            </button>
          </div>
          {/* Najetí myší nápovědu ukáže, klepnutí (tabule, tablet) ji připne. */}
          <p className={`${noteOpen ? 'block' : 'hidden group-hover:block'} mt-2 rounded-xl px-3 py-2 text-xs md:text-sm text-[#e7ecff] leading-snug`} style={{ background: 'rgba(8,12,30,.88)', border: '1px solid rgba(255,255,255,.14)' }}>{note}</p>
        </div>
        {view === 'orbit' ? <p className="absolute top-3 right-4 z-10 text-sm md:text-base font-bold text-[#e7ecff] tabular-nums pointer-events-none">Uběhlo {clock}</p> : null}
        {dayNight ? (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold shadow-lg" style={DAY_PART_STYLE[dayPart]}>
            <span className="text-2xl leading-none" aria-hidden="true">{DAY_PART_ICON[dayPart]}</span>
            {DAY_PART_TEXT[dayPart]}
          </div>
        ) : null}
        {compare && planet && planet.id !== 'zeme' ? (
          <CompareWithEarth other={planet.id} name={planet.name} ratio={planet.re} thumbs={compareThumbs} onClose={() => setCompare(false)} />
        ) : null}
        {compare && selected === 'mesic' ? (
          <CompareWithEarth
            other="mesic"
            name="Měsíc"
            ratio={MOON_EARTH_RATIO}
            text="Přes Zemi by se vedle sebe vešly skoro 4 Měsíce."
            thumbs={compareThumbs}
            onClose={() => setCompare(false)}
          />
        ) : null}
        {/* Ovládací lišta: přehrávání, dvě volby „jedna ze dvou“ a vypínač popisků – každý druh vypadá jinak. */}
        <div
          className="absolute left-3 right-3 bottom-3 z-10 flex flex-wrap xl:flex-nowrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2"
          style={{ background: 'rgba(8,12,30,.78)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(6px)' }}
        >
          {/* Na počítači je „Celá soustava“ v panelu vedle; v liště jen na úzké obrazovce, kde je panel až pod modelem. */}
          {focused ? (
            <div className="flex items-center lg:hidden">
              <SpaceButton onClick={overview}>← Celá soustava</SpaceButton>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              aria-label={playing ? 'Pozastavit' : 'Spustit'}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              style={{ background: '#f0a12c', color: '#2a1700' }}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5" fill="currentColor"><path d="M7 5v14l12-7z" /></svg>
              )}
            </button>
            {dayNight ? (
              <span className="font-bold text-[#e7ecff] tabular-nums whitespace-nowrap">1 s = 3 hodiny</span>
            ) : (
            <label className="flex items-center gap-2 text-sm text-[#9aa6d1]" title="Rychlost">
              <span className="hidden 2xl:inline">Rychlost</span>
              <input type="range" min={0} max={100} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-20 xl:w-28 accent-[#f0a12c]" aria-label="Rychlost" />
              <span className="font-bold text-[#e7ecff] tabular-nums whitespace-nowrap min-w-[7.5rem]">{speedLabel(speed)}</span>
            </label>
            )}
          </div>
          <SpaceSegmented
            label="Pohled"
            value={view}
            onChange={setView}
            options={[{ value: 'orbit', label: 'Oběžné dráhy' }, { value: 'size', label: 'Skutečné velikosti' }]}
          />
          <SpaceSegmented
            label="Vzhled"
            value={style}
            onChange={setStyle}
            options={[{ value: 'realny', label: 'Opravdový' }, { value: 'kresleny', label: 'Kreslený' }]}
          />
          <SpaceSwitch label="Popisky" checked={labels} onChange={setLabels} />
        </div>
      </div>

      <aside className="rounded-3xl bg-white text-[#0f1d4d] flex flex-col min-w-0 overflow-hidden lg:overflow-y-auto" aria-live="polite">
        {focused ? (
        <>
        {/* Vesmírná hlavička: název, velká planeta, šipky na předchozí / další těleso a řada všech těles. */}
        {/* Hlavička má pevnou výšku pro všechna tělesa, ať při přepínání planet nic neposkakuje. */}
        <div className="relative flex-shrink-0 h-[270px] flex flex-col px-5 pt-4 pb-3 text-white" style={{ background: 'linear-gradient(180deg, #121c55 0%, #0b1236 100%)' }}>
          {HERO_STARS.map(([x, y, r, c], i) => (
            <span key={i} className="absolute rounded-full pointer-events-none" style={{ left: `${x}%`, top: `${y}%`, width: r, height: r, background: c, opacity: 0.8 }} />
          ))}
          {/* Horní lišta: zpět vlevo, pořadí vpravo – nic se nepřekrývá s názvem. */}
          <div className="relative flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={overview}
              className="flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              Celá soustava
            </button>
            <span className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-[#9aa6d1] text-right leading-tight">
              {planet ? `${planet.order}. planeta od Slunce` : other ? 'Vesmírné těleso' : ''}
            </span>
          </div>
          <h2 className="relative text-3xl font-bold text-center mt-2">{planet?.name ?? other?.name}</h2>
          <div className="relative flex-1 flex items-center justify-between mt-1">
            <button type="button" onClick={() => step(-1)} aria-label="Předchozí" className="w-10 h-10 rounded-full bg-white text-[#0f1d4d] flex items-center justify-center hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            </button>
            <BodyImage id={selected} size={128} src={thumbs[selected]} />
            <button type="button" onClick={() => step(1)} aria-label="Další" className="w-10 h-10 rounded-full bg-white text-[#0f1d4d] flex items-center justify-center hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
          <div className="relative flex items-end justify-center gap-1.5 mt-3" role="tablist" aria-label="Tělesa Sluneční soustavy">
            {BODY_ORDER.map((id) => {
              const on = id === selected;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  title={bodyName(id)}
                  onClick={() => choose(id)}
                  className="rounded-full transition-all"
                  style={{ width: on ? 26 : 10, height: 6, background: on ? '#fff' : 'rgba(255,255,255,.35)' }}
                />
              );
            })}
          </div>
        </div>

        <div className="px-5 pt-4 pb-6 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <p className="text-base leading-relaxed flex-1 text-[#4e5871]">{planet?.text ?? other?.text}</p>
            <ReadButton text={planet ? `${planet.name}. ${planet.order}. planeta od Slunce. ${planet.text}` : other ? `${other.name}. ${other.text}` : ''} iconOnly />
          </div>
          {planet ? (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <FactTile label="Typ" value={`${planet.type}`} visual={<span className="text-[34px] leading-none" role="img" aria-label={planet.type === 'kamenná' ? 'kámen' : 'plyn'}>{planet.type === 'kamenná' ? '🪨' : '☁️'}</span>} />
              <FactTile label="Oběh kolem Slunce" value={planet.orbitText} visual={<OrbitIcon color={PLANET_CARD[planet.id]} />} />
              <FactTile
                label="Velikost"
                value={planet.id === 'zeme' ? 'naše měřítko' : planet.re >= 1.5 ? `${Math.round(planet.re)}× širší než Země` : `${Math.round(planet.re * 100)} % Země`}
                visual={<SizeCompare planetId={planet.id} ratio={planet.re} src={thumbs[planet.id]} earthSrc={thumbs.zeme} />}
              />
            </div>
          ) : null}
          {!focused ? (
            <button
              type="button"
              onClick={() => choose(selected)}
              className="h-11 rounded-full bg-[#eef1f8] hover:bg-[#e2e7f3] font-bold text-[#4e5871] transition-colors"
            >
              {`Přiblížit ${bodyAccusative(selected)}`}
            </button>
          ) : null}
          {planet ? (() => {
            const prev = SPACE_PLANETS.find((p) => p.order === planet.order - 1);
            const next = SPACE_PLANETS.find((p) => p.order === planet.order + 1);
            const me = PLANET_CARD[planet.id];
            const card = (n: (typeof SPACE_PLANETS)[number], side: 'prev' | 'next') => (
              <button
                key={n.id}
                type="button"
                onClick={() => choose(n.id)}
                className="relative overflow-hidden rounded-2xl h-24 p-3 text-left text-white hover:-translate-y-0.5 transition-transform"
                style={{ background: PLANET_CARD[n.id], gridColumn: side === 'prev' ? 1 : 2 }}
              >
                <img src={thumbs[n.id] ?? planetIcon(n.id)} alt="" className="absolute -right-3 -top-3 w-20 h-20 object-contain" />
                <span className="absolute left-3 bottom-2.5">
                  <span className="block text-xl font-bold leading-tight">{n.name}</span>
                  <span className="block text-xs opacity-90">{side === 'prev' ? '← blíž ke Slunci' : 'dál od Slunce →'}</span>
                </span>
              </button>
            );
            return (
              <div className="pt-1">
                <p className="text-sm font-bold text-[#56628a] mb-2">{prev && next ? 'Vedle ní jsou' : 'Vedle ní je'}</p>
                <div className="grid grid-cols-2 gap-3">
                  {prev ? card(prev, 'prev') : null}
                  {next ? card(next, 'next') : null}
                </div>
                {/* Spojnice: soused blíž ke Slunci – tahle planeta – soused dál. Barvy přecházejí mezi planetami. */}
                <div className="relative h-11 mt-1 mx-6">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
                    style={{
                      left: prev ? 0 : '50%',
                      right: next ? 0 : '50%',
                      background: `linear-gradient(90deg, ${prev ? PLANET_CARD[prev.id] : me}, ${me} 50%, ${next ? PLANET_CARD[next.id] : me})`,
                    }}
                  />
                  {prev ? (
                    <img src={thumbs[prev.id] ?? planetIcon(prev.id)} alt="" className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 object-contain rounded-full bg-white" style={{ boxShadow: `0 0 0 2px ${PLANET_CARD[prev.id]}` }} />
                  ) : null}
                  {next ? (
                    <img src={thumbs[next.id] ?? planetIcon(next.id)} alt="" className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 object-contain rounded-full bg-white" style={{ boxShadow: `0 0 0 2px ${PLANET_CARD[next.id]}` }} />
                  ) : null}
                  <img
                    src={thumbs[planet.id] ?? planetIcon(planet.id)}
                    alt=""
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 object-contain rounded-full bg-white"
                    style={{ boxShadow: `0 0 0 3px ${me}` }}
                  />
                </div>
              </div>
            );
          })() : null}
          {planet && planet.id !== 'zeme' ? (
            <div className="pt-1">
              <p className="text-sm font-bold text-[#56628a] mb-2">Vyzkoušej si</p>
              <button
                type="button"
                onClick={() => setCompare(true)}
                className="relative w-full overflow-hidden rounded-2xl h-24 p-3 text-left text-white hover:-translate-y-0.5 transition-transform"
                style={{ background: `linear-gradient(90deg, ${PLANET_CARD[planet.id]} 0%, #2f6fd1 100%)` }}
              >
                <span className="absolute right-3 top-3 flex items-end gap-1.5">
                  <img src={thumbs.zeme ?? planetIcon('zeme')} alt="" className="w-6 h-6 object-contain" />
                  <img src={thumbs[planet.id] ?? planetIcon(planet.id)} alt="" className="w-12 h-12 object-contain" />
                </span>
                <span className="absolute left-3 bottom-2.5">
                  <span className="block text-xl font-bold leading-tight">Porovnej se Zemí</span>
                  <span className="block text-xs opacity-90">Postav ji vedle Země →</span>
                </span>
              </button>
            </div>
          ) : null}
          {selected === 'mesic' ? (
            <div className="pt-1">
              <p className="text-sm font-bold text-[#56628a] mb-2">Vyzkoušej si</p>
              <button
                type="button"
                onClick={() => setCompare(true)}
                className="relative w-full overflow-hidden rounded-2xl h-24 p-3 text-left text-white hover:-translate-y-0.5 transition-transform"
                style={{ background: 'linear-gradient(90deg, #7d7b75 0%, #2f6fd1 100%)' }}
              >
                <span className="absolute right-3 top-3 flex items-end gap-1.5">
                  <img src={thumbs.mesic ?? planetIcon('zeme')} alt="" className="w-4 h-4 object-contain" />
                  <img src={thumbs.zeme ?? planetIcon('zeme')} alt="" className="w-12 h-12 object-contain" />
                </span>
                <span className="absolute left-3 bottom-2.5">
                  <span className="block text-xl font-bold leading-tight">Porovnej se Zemí</span>
                  <span className="block text-xs opacity-90">Kolik Měsíců se vejde přes Zemi? →</span>
                </span>
              </button>
            </div>
          ) : null}
          {selected === 'zeme' ? (
            <div className={dayNight ? 'rounded-2xl p-4 bg-[#eef1f8]' : 'pt-1'}>
              {dayNight ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-bold text-[#0f1d4d]">Proč se střídá den a noc?</p>
                    <ReadButton text={DAY_NIGHT_TEXT} iconOnly />
                  </div>
                  <p className="mt-1 text-base leading-relaxed text-[#4e5871]">{DAY_NIGHT_TEXT}</p>
                  <p className="mt-2 text-sm text-[#56628a]">Sleduj červenou značku: tam jsme my.</p>
                  <button
                    type="button"
                    onClick={() => setDayNight(false)}
                    className="mt-3 inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#e2e7f3] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                    Zpět na oběh kolem Slunce
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#56628a] mb-2">Vyzkoušej si</p>
                  {/* Stejná karta jako sousední planety: plynulý přechod ze dne do noci, Země napůl ve stínu. */}
                  <button
                    type="button"
                    onClick={() => setDayNight(true)}
                    className="relative w-full overflow-hidden rounded-2xl h-24 p-3 text-left text-white hover:-translate-y-0.5 transition-transform"
                    style={{ background: 'linear-gradient(90deg, #e9a23b 0%, #c98a4a 35%, #3b3f8c 75%, #1f2a6b 100%)' }}
                  >
                    <span className="absolute -right-3 -top-3 w-20 h-20 rounded-full overflow-hidden">
                      <img src={thumbs.zeme ?? planetIcon('zeme')} alt="" className="w-full h-full object-contain" />
                      <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,14,40,0) 48%, rgba(10,14,40,.78) 56%)' }} />
                    </span>
                    <span className="absolute left-3 bottom-2.5">
                      <span className="block text-xl font-bold leading-tight">Den a noc</span>
                      <span className="block text-xs opacity-90">Podívej se, jak se Země otáčí →</span>
                    </span>
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        </>
        ) : (
        <>
          {/* Celá soustava: žádná planeta není vybraná – panel ukáže přehled a nabídne výběr. */}
          <div className="relative px-5 pt-5 pb-5 text-white" style={{ background: 'linear-gradient(180deg, #121c55 0%, #0b1236 100%)' }}>
            {HERO_STARS.map(([x, y, r, c], i) => (
              <span key={i} className="absolute rounded-full pointer-events-none" style={{ left: `${x}%`, top: `${y}%`, width: r, height: r, background: c, opacity: 0.8 }} />
            ))}
            {race ? (
              // Během závodu je „zpět“ nahoře, stejně jako „Celá soustava“ v detailu planety.
              <div className="relative flex">
                <button
                  type="button"
                  onClick={() => setRace(false)}
                  className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                  Konec závodu
                </button>
              </div>
            ) : (
              <p className="relative text-xs font-bold uppercase tracking-widest text-[#9aa6d1] text-center">Celá soustava</p>
            )}
            <h2 className={`relative font-bold text-center ${race ? 'text-2xl mt-2' : 'text-3xl mt-1'}`}>{race ? 'Závod planet' : 'Sluneční soustava'}</h2>
            {/* Jako na plakátu: obrovské Slunce vlevo (vidět jen okraj se září), planety za ním v řadě
                a ve velikostech blíž skutečnosti. Řada se v úzkém panelu poměrně zmenší. */}
            {/* Během závodu je řada planet v panelu jako výsledková tabulka – hlavička se zmenší, ať se vše vejde bez rolování. */}
            {race ? null : (
            <div className="relative mt-4 -mx-5 h-32">
              <button
                type="button"
                onClick={() => choose('slunce')}
                title="Slunce"
                aria-label="Slunce"
                className="absolute top-1/2 -translate-y-1/2 rounded-full overflow-hidden hover:brightness-110 transition"
                style={{ width: 260, height: 260, left: -222, boxShadow: '0 0 40px 14px rgba(255,150,40,.55), 0 0 90px 30px rgba(255,120,20,.25)' }}
              >
                {thumbs.slunce ? (
                  <img src={thumbs.slunce} alt="" className="w-full h-full object-cover scale-[1.08]" />
                ) : (
                  <span className="block w-full h-full" style={{ background: 'radial-gradient(circle at 70% 50%, #fff3b0, #ffb732 40%, #f06a1a 100%)' }} />
                )}
              </button>
              <div className="absolute inset-y-0 right-2 flex items-center justify-center gap-2" style={{ left: 50 }}>
                {SPACE_PLANETS.map((p) => {
                  const sz = OVERVIEW_SIZE[p.id];
                  // Malé planety jsou ve skutečném poměru jen pár pixelů – tlačítko kolem nich je větší,
                  // aby se na ně dalo klepnout, obrázek si drží skutečnou velikost.
                  const hit = Math.max(sz, 10);
                  return (
                    <button key={p.id} type="button" onClick={() => choose(p.id)} title={p.name} className="min-w-0 flex justify-center hover:scale-110 transition-transform" style={{ flex: `0 1 ${hit}px` }}>
                      {thumbs[p.id] ? <img src={thumbs[p.id]} alt={p.name} className="h-auto aspect-square object-contain" style={{ width: `${(sz / hit) * 100}%` }} /> : <BodyImage id={p.id} size={sz} />}
                    </button>
                  );
                })}
              </div>
            </div>
            )}
          </div>
          <div className="p-5 flex flex-col gap-3">
            {race ? (
              <>
                <div className="flex items-start gap-3">
                  <p className="text-base leading-relaxed flex-1 text-[#4e5871]">{RACE_TEXT}</p>
                  <ReadButton text={RACE_TEXT} iconOnly />
                </div>
                <p className="text-sm font-bold text-[#56628a]">Kolikrát už oběhla Slunce</p>
                {/* Pod sebou v pořadí od Slunce – místa je dost a pořadí se tak čte samo. */}
                <div className="flex flex-col gap-1.5">
                  {SPACE_PLANETS.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-[#f4f6fb] px-3 py-1.5 min-w-0">
                      <img src={thumbs[p.id] ?? planetIcon(p.id)} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate font-bold" style={{ color: BODY_COLOR[p.id] }}>{p.name}</span>
                      <span className="font-bold tabular-nums text-[#0f1d4d]">{laps[p.id] ?? 0}×</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
            <>
            <p className="text-base leading-snug text-[#56628a]">Klepni na planetu v modelu, nebo si ji vyber tady.</p>
            {/* Nahoře planety (4 v řadě), pod nimi vedle sebe Hvězda (vlevo) a Další tělesa (vpravo) ve stejné mřížce. */}
            {(() => {
              const tile = (id: SolarBodyId) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => choose(id)}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-[#f4f6fb] hover:bg-[#eef1f8] py-2 transition-colors"
                >
                  <span className="w-[52px] h-[52px] flex items-center justify-center">
                    {thumbs[id] ? (
                      <img src={thumbs[id]} alt="" className="w-[52px] h-[52px] object-contain" />
                    ) : SPACE_PLANETS.some((p) => p.id === id) ? (
                      <img src={planetIcon(id as PlanetKey)} alt="" className="w-[52px] h-[52px] object-contain" />
                    ) : (
                      // Kometa je kreslená pro tmavé nebe – na světlé dlaždici dostane kousek oblohy.
                      <span className="w-[52px] h-[52px] rounded-full flex items-center justify-center overflow-hidden" style={{ background: '#0b1236' }}>
                        <BodyImage id={id} size={44} />
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-bold" style={{ color: BODY_COLOR[id] }}>{bodyName(id)}</span>
                </button>
              );
              const group = (title: string) => BODY_GROUPS.find((g) => g.title === title)!;
              return (
                <>
                  <div>
                    <p className="text-xs font-bold text-[#56628a] mb-2">Planety</p>
                    <div className="grid grid-cols-4 gap-2">{group('Planety').ids.map(tile)}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-1">
                      <p className="text-xs font-bold text-[#56628a] mb-2">Hvězda</p>
                      <div className="grid grid-cols-1 gap-2">{group('Hvězda').ids.map(tile)}</div>
                    </div>
                    <div className="col-start-3 col-span-2">
                      <p className="text-xs font-bold text-[#56628a] mb-2">Další tělesa</p>
                      <div className="grid grid-cols-2 gap-2">{group('Další tělesa').ids.map(tile)}</div>
                    </div>
                  </div>
                </>
              );
            })()}
            {view === 'orbit' ? (
              <div className="pt-1">
                <p className="text-xs font-bold text-[#56628a] mb-2">Vyzkoušej si</p>
                <button
                  type="button"
                  onClick={() => setRace(true)}
                  className="relative w-full overflow-hidden rounded-2xl h-24 p-3 text-left text-white hover:-translate-y-0.5 transition-transform"
                  style={{ background: 'linear-gradient(90deg, #4a43e8 0%, #2b2f86 100%)' }}
                >
                  {/* Tři planety v řadě za sebou jako na startu. */}
                  <span className="absolute right-3 top-3 flex items-center gap-1.5">
                    {(['merkur', 'zeme', 'jupiter'] as PlanetKey[]).map((id, i) => (
                      <img key={id} src={thumbs[id] ?? planetIcon(id)} alt="" className="object-contain" style={{ width: [18, 26, 44][i], height: [18, 26, 44][i] }} />
                    ))}
                  </span>
                  <span className="absolute left-3 bottom-2.5">
                    <span className="block text-xl font-bold leading-tight">Závod planet</span>
                    <span className="block text-xs opacity-90">Která oběhne Slunce nejrychleji? →</span>
                  </span>
                </button>
              </div>
            ) : null}
            </>
            )}
          </div>
        </>
        )}
      </aside>
    </div>
  );
}

/**
 * Porovnej se Zemí: těleso a Země vedle sebe ve skutečném poměru a řada menších koulí přes tu větší.
 * `ratio` = kolikrát je těleso širší než Země.
 */
function CompareWithEarth({ other, name, ratio, text: textOverride, thumbs, onClose }: { other: SolarBodyId; name: string; ratio: number; text?: string; thumbs: Partial<Record<SolarBodyId, string>>; onClose: () => void }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 600, h: 400 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const re = ratio;
  const big = re >= 1; // těleso je větší než Země
  const ring = RING_FACTOR[other as PlanetKey] ?? 1;
  // Průměr té větší koule; u Saturnu a Uranu se musí vejít i prstence.
  // Menší než celé plátno, ať se planeta, řada pod ní i věta vejdou s rezervou a nic není obří.
  const D = Math.min((box.w * (big ? 0.36 : 0.26)) / ring, box.h * (big ? 0.42 : 0.34));
  const earthD = big ? D / re : D;
  const planetD = big ? D : D * re;
  const n = big ? Math.round(re) : Math.round(1 / re);
  // Řada dole už nestojí u planety, takže nemusí být ve skutečném měřítku – koule jsou tak velké, aby se poznaly.
  const rowD = Math.max(40, Math.min(72, big ? earthD : planetD));
  const src = (id: SolarBodyId) => thumbs[id] ?? planetIcon(id as PlanetKey);
  const text = textOverride ?? (n <= 1
    ? `${name} je skoro stejně velká jako Země.`
    : big
      ? `Přes ${bodyAccusative(other)} by se vedle sebe ${n <= 4 ? 'vešly' : 'vešlo'} asi ${n} ${n <= 4 ? 'Země' : 'Zemí'}.`
      : `Přes Zemi by se vedle sebe ${n <= 4 ? 'vešly' : 'vešlo'} asi ${n} ${n <= 4 ? 'takové planety' : 'takových planet'}.`);
  const ball = (id: SolarBodyId, d: number, withRing = 1) => (
    <span className="relative flex items-center justify-center flex-shrink-0" style={{ width: d, height: d }}>
      <img src={src(id)} alt="" className="absolute max-w-none object-contain" style={{ width: d * withRing, height: d * withRing }} />
    </span>
  );
  return (
    <div className="absolute inset-0 z-30 flex flex-col text-white" style={{ background: 'radial-gradient(circle at 50% 40%, #16205a 0%, #060a1c 75%)' }}>
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          Zpět do modelu
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-[#9aa6d1]">Skutečný poměr velikostí</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-center mt-2">Země a {name}</h2>
      <div ref={stageRef} className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6">
        <div className="flex items-center justify-center" style={{ gap: Math.max(24, D * 0.18 * ring) }}>
          <span className="flex flex-col items-center gap-2">
            {ball('zeme', earthD)}
            <span className="text-sm font-bold text-[#7fb8ff]">Země</span>
          </span>
          <span className="flex flex-col items-center gap-2">
            {/* Čárkovaný kruh = velikost Země přímo na planetě: hned je vidět, o kolik je větší nebo menší. */}
            <span className="relative flex items-center justify-center" style={{ width: Math.max(planetD, earthD), height: Math.max(planetD, earthD) }}>
              {ball(other, planetD, ring)}
              <span className="absolute rounded-full border-2 border-dashed pointer-events-none" style={{ width: earthD, height: earthD, borderColor: '#7fb8ff', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 0 1px rgba(6,10,28,.5)' }} />
            </span>
            <span className="text-sm font-bold" style={{ color: BODY_COLOR[other] }}>{name}</span>
            <span className="-mt-1 text-xs font-bold text-[#7fb8ff] flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full border-2 border-dashed border-[#7fb8ff]" />velikost Země</span>
          </span>
        </div>
      </div>
      {/* Dole u okraje: řada menších koulí a věta. Dlouhá řada (víc než 6) se zalomí do dvou řádků. */}
      <div className="flex flex-col items-center gap-3 px-6 pb-8 pt-2">
        {n > 1 ? (
          <div
            className="flex flex-wrap justify-center rounded-3xl px-2 py-1"
            style={{ background: 'rgba(255,255,255,.06)', maxWidth: (n > 6 ? Math.ceil(n / 2) : n) * (rowD + 6) + 16, gap: 6 }}
          >
            {Array.from({ length: n }, (_, i) => <React.Fragment key={i}>{ball(big ? 'zeme' : other, rowD)}</React.Fragment>)}
          </div>
        ) : null}
        <p className="text-lg md:text-xl font-bold text-center max-w-xl">{text}</p>
      </div>
    </div>
  );
}

const ECLIPSE_INFO: Record<'slunce' | 'mesic', { name: string; note: string }> = {
  slunce: { name: 'Zatmění Slunce', note: 'Měsíc je přesně mezi Sluncem a Zemí a zakryje nám Slunce. Na Zemi dopadne stín Měsíce a na chvíli se setmí.' },
  mesic: { name: 'Zatmění Měsíce', note: 'Země je přesně mezi Sluncem a Měsícem. Měsíc zajde do stínu Země a zčervená.' },
};
const ECLIPSE_WHY = 'Dráha Měsíce je trochu nakloněná. Při novu a úplňku proto Měsíc většinou projde kousek nad stínem, nebo pod ním. Zatmění nastane, jen když se trefí přesně.';
/** Měsíc má poloměr 1 737 km, Země 6 371 km → Měsíc je asi 0,27 Země (Země je 3,7× širší). */
const MOON_EARTH_RATIO = 1737 / 6371;
const RACE_TEXT = 'Všechny planety vyrazily ze startovní čáry najednou. Čím dál je planeta od Slunce, tím delší cestu má a tím déle jí trvá jeden oběh. Jeden oběh kolem Slunce je pro planetu jeden její rok.';
const DAY_NIGHT_TEXT = 'Země se pořád otáčí kolem své osy. Jedna celá otočka trvá jeden den. Polovina Země, která je zrovna otočená ke Slunci, má den. Druhá polovina je ve stínu a má noc.';
const DAY_PART_TEXT: Record<DayPart, string> = { den: 'U nás je den', noc: 'U nás je noc', rano: 'U nás vychází Slunce', vecer: 'U nás zapadá Slunce' };
const DAY_PART_ICON: Record<DayPart, string> = { den: '☀️', noc: '🌙', rano: '🌅', vecer: '🌇' };
const DAY_PART_STYLE: Record<DayPart, React.CSSProperties> = {
  den: { background: '#ffe79a', color: '#3a2a00' },
  noc: { background: '#1f2a6b', color: '#e7ecff', border: '1px solid rgba(255,255,255,.25)' },
  rano: { background: '#ffc58a', color: '#3a1d00' },
  vecer: { background: '#f59a7a', color: '#3a1200' },
};

function formatYears(y: number, hours = false) {
  if (hours) {
    // Den a noc: počítáme dny a hodiny.
    const total = Math.floor(y * 365.25 * 24);
    const d = Math.floor(total / 24), h = total % 24;
    const days = d === 0 ? '' : `${d} ${d === 1 ? 'den' : d <= 4 ? 'dny' : 'dní'} a `;
    return `${days}${h} ${h === 1 ? 'hodina' : h >= 2 && h <= 4 ? 'hodiny' : 'hodin'}`;
  }
  if (y < 1) {
    const d = Math.round(y * 365);
    return `${d} ${d === 1 ? 'den' : d >= 2 && d <= 4 ? 'dny' : 'dní'}`;
  }
  const v = Math.floor(y * 10) / 10;
  const whole = Math.floor(v);
  const unit = v !== whole ? 'roku' : whole === 1 ? 'rok' : whole <= 4 ? 'roky' : 'let';
  return `${v.toLocaleString('cs-CZ')} ${unit} na Zemi`;
}

/* ------------------------------------------------------------ fáze Měsíce */

/**
 * Časová osa Měsíce: 8 fází v 8 stejných sloupcích, fáze i stojí uprostřed sloupce i.
 * Pozice na ose (0–1) je proto posunutá o půl sloupce proti dnu od novu.
 */
const PHASE_SLOT = 1 / 8;
function timelinePos(day: number) {
  return (((day / SYNODIC) + PHASE_SLOT / 2) % 1 + 1) % 1;
}
function timelineDay(pos: number) {
  return ((((pos - PHASE_SLOT / 2) % 1) + 1) % 1) * SYNODIC;
}

/** Den od novu celým číslem – desetiny dne dětem nic neřeknou. Kolem novu „Den novu“ místo „0. den“. */
function dayFromNewLabel(day: number) {
  const d = Math.round(((day % SYNODIC) + SYNODIC) % SYNODIC);
  return d === 0 || d >= 30 ? 'Den novu' : `${d}. den od novu`;
}

function MoonModel({ settings }: { settings?: Record<string, any> }) {
  const still = useMemo(prefersReducedMotion, []);
  const orbitRef = useRef<HTMLCanvasElement | null>(null);
  const skyRef = useRef<HTMLCanvasElement | null>(null);
  const [day, setDay] = useState(() => (settings?.startToday ? todayMoonDay() : 14.77));
  const [playing, setPlaying] = useState(false);
  const [hintDC, setHintDC] = useState(settings?.hintDC !== false);
  const [today, setToday] = useState<string | null>(null);
  // Zatmění: Měsíc se postaví do novu / úplňku a model ukáže stín.
  const [eclipse, setEclipse] = useState<Eclipse>(null);
  const eclipseRef = useRef<Eclipse>(null);
  eclipseRef.current = eclipse;
  const dayRef = useRef(day);
  const playingRef = useRef(playing);
  const hintRef = useRef(hintDC);
  dayRef.current = day;
  playingRef.current = playing;
  hintRef.current = hintDC;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        const next = (dayRef.current + dt * 3) % SYNODIC;
        dayRef.current = next;
        setDay(next);
      }
      const t = now / 1000;
      if (orbitRef.current) drawMoonOrbit(orbitRef.current, dayRef.current, t, still, eclipseRef.current);
      if (skyRef.current) drawMoonSky(skyRef.current, dayRef.current, hintRef.current, t, still, eclipseRef.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [still]);

  const idx = phaseIndex(day);
  const phase = MOON_PHASE_INFO[idx];
  const jump = (d: number) => { setPlaying(false); setToday(null); setEclipse(null); setDay(d); };
  const showEclipse = (e: Exclude<Eclipse, null>) => {
    const d = e === 'slunce' ? 0 : SYNODIC / 2;
    setPlaying(false); setToday(null); dayRef.current = d; setDay(d); setEclipse(e);
  };

  // Měsíc jde chytit a táhnout po dráze (nebo klepnout kamkoli na dráhu).
  const dragging = useRef(false);
  const [grab, setGrab] = useState<'none' | 'grab' | 'grabbing'>('none');
  const moveMoon = (d: number) => { dayRef.current = d; setDay(d); };
  const onOrbitDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = moonOrbitPointer(e.currentTarget, e.clientX, e.clientY, dayRef.current);
    if (!hit.onMoon && !hit.onOrbit) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlaying(false);
    setToday(null);
    setGrab('grabbing');
    setEclipse(null);
    moveMoon(hit.day);
  };
  const onOrbitMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = moonOrbitPointer(e.currentTarget, e.clientX, e.clientY, dayRef.current);
    if (dragging.current) { moveMoon(hit.day); return; }
    setGrab(hit.onMoon || hit.onOrbit ? 'grab' : 'none');
  };
  const onOrbitUp = () => { dragging.current = false; setGrab('none'); };

  const thumbs = useMemo(() => MOON_PHASE_INFO.map((p) => moonThumb(p.at, 64)), []);
  const eclipseInfo = eclipse ? ECLIPSE_INFO[eclipse] : null;
  const [noteOpen, setNoteOpen] = useState(false);
  const stepPhase = (dir: number) => jump(MOON_PHASE_INFO[(idx + dir + MOON_PHASE_INFO.length) % MOON_PHASE_INFO.length].at);

  // Rozložení 2/3 + 1/3 jako Sluneční soustava: velký pohled shora s tmavou lištou, vpravo panel
  // s Měsícem tak, jak ho vidíme ze Země, popisem, všemi fázemi a zatměním.
  return (
    <div className={`w-full min-h-[100svh] lg:h-[100svh] bg-[#eef1f8] p-3 md:p-5 ${settings ? NAV_SPACE : ''} grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,29vw)] lg:grid-rows-[minmax(0,1fr)]`}>
      <div className={`relative rounded-3xl overflow-hidden bg-[#060a1c] min-h-[60svh] lg:min-h-0 ${settings ? NAV_LEFT : ''}`}>
        <canvas
          ref={orbitRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: grab === 'none' ? 'default' : grab }}
          onPointerDown={onOrbitDown}
          onPointerMove={onOrbitMove}
          onPointerUp={onOrbitUp}
          onPointerCancel={onOrbitUp}
          onPointerLeave={() => !dragging.current && setGrab('none')}
          aria-label="Pohled shora: Slunce, Země a Měsíc na oběžné dráze. Měsícem jde táhnout po dráze."
        />
        <div className="group absolute top-3 right-4 z-20 max-w-[min(24rem,60%)] flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-bold text-[#e7ecff]">Chyť Měsíc a táhni ho</span>
            <button
              type="button"
              onClick={() => setNoteOpen((v) => !v)}
              aria-label="Jak model ovládat"
              aria-expanded={noteOpen}
              className="w-6 h-6 rounded-full border border-white/40 text-[#e7ecff] text-xs font-bold flex items-center justify-center hover:bg-white/10"
            >
              i
            </button>
          </div>
          <p className={`${noteOpen ? 'block' : 'hidden group-hover:block'} mt-2 rounded-xl px-3 py-2 text-xs md:text-sm text-[#e7ecff] leading-snug`} style={{ background: 'rgba(8,12,30,.88)', border: '1px solid rgba(255,255,255,.14)' }}>
            Pohled shora. Měsícem můžeš táhnout po dráze, nebo klepnout kamkoli na dráhu. Vpravo uvidíš, jak Měsíc vypadá ze Země.
          </p>
        </div>
        <div
          className="absolute left-3 right-3 bottom-3 z-10 flex flex-wrap xl:flex-nowrap items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-2"
          style={{ background: 'rgba(8,12,30,.78)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(6px)' }}
        >
          <button
            type="button"
            aria-label={playing ? 'Pozastavit' : 'Spustit'}
            onClick={() => { setToday(null); setEclipse(null); setPlaying((v) => !v); }}
            className="w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{ background: '#f0a12c', color: '#2a1700' }}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>
            )}
          </button>
          <div className="relative h-8 flex items-center flex-1 min-w-[10rem]">
            <div className="absolute inset-x-0 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,.18)' }} />
            <div className="absolute left-0 h-1.5 rounded-full bg-[#f0a12c]" style={{ width: `${timelinePos(day) * 100}%` }} />
            {MOON_PHASE_INFO.map((p, i) => (
              <span key={p.name} className="absolute w-1.5 h-1.5 rounded-full -translate-x-1/2" style={{ left: `${((i + 0.5) / MOON_PHASE_INFO.length) * 100}%`, background: 'rgba(255,255,255,.45)' }} />
            ))}
            <div className="absolute w-5 h-5 rounded-full bg-white -translate-x-1/2 pointer-events-none" style={{ left: `${timelinePos(day) * 100}%`, border: '4px solid #f0a12c' }} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={timelinePos(day)}
              aria-label="Den od novu"
              onChange={(e) => jump(timelineDay(Number(e.target.value)))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="font-bold text-[#e7ecff] tabular-nums whitespace-nowrap">{today ? `Dnes (${today})` : dayFromNewLabel(day)}</span>
          <SpaceButton onClick={() => { setPlaying(false); setEclipse(null); setDay(todayMoonDay()); setToday(new Date().toLocaleDateString('cs-CZ')); }}>Dnes na obloze</SpaceButton>
          <SpaceSwitch label="Nápověda D / C" checked={hintDC} onChange={setHintDC} />
        </div>
      </div>

      <aside className="rounded-3xl bg-white text-[#0f1d4d] flex flex-col min-w-0 overflow-hidden lg:overflow-y-auto" aria-live="polite">
        <div className="relative flex-shrink-0 h-[300px] text-white overflow-hidden bg-[#060a1c]">
          {/* Obloha začíná pod nadpisem, ať Měsíc nezakrývá název fáze. */}
          <canvas ref={skyRef} className="absolute left-0 right-0 bottom-0 w-full" style={{ top: 92, height: 'calc(100% - 92px)' }} aria-label="Jak Měsíc vidíme ze Země." />
          <div className="relative px-5 pt-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9aa6d1] py-2">Takhle ho vidíme ze Země</span>
          </div>
          <div className="relative flex items-center justify-between gap-3 px-5 mt-1">
            <button type="button" onClick={() => stepPhase(-1)} aria-label="Předchozí fáze" className="w-10 h-10 flex-shrink-0 rounded-full bg-white text-[#0f1d4d] flex items-center justify-center hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
            </button>
            <h2 className="text-3xl font-bold text-center leading-tight">{eclipseInfo ? eclipseInfo.name : phase.name}</h2>
            <button type="button" onClick={() => stepPhase(1)} aria-label="Další fáze" className="w-10 h-10 flex-shrink-0 rounded-full bg-white text-[#0f1d4d] flex items-center justify-center hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-6 flex flex-col gap-3">
          {/* Vždy na výšku dvou řádků – popis fáze se zalomí za tečkou, ať text pod ním neposkakuje. */}
          <p className="text-[15px] leading-snug text-[#4e5871] min-h-[2.75em]">
            {eclipseInfo
              ? eclipseInfo.note
              : phase.note.split(/(?<=\.) (?=\p{Lu})/u).map((part, i) => <React.Fragment key={i}>{i > 0 ? <br /> : null}{part}</React.Fragment>)}
          </p>
          {eclipseInfo ? (
            <div className="rounded-2xl bg-[#eef1f8] p-3 flex flex-col gap-1.5">
              <p className="text-sm font-bold text-[#0f1d4d]">Proč to není každý měsíc?</p>
              <p className="text-sm leading-snug text-[#4e5871]">{ECLIPSE_WHY}</p>
              {eclipse === 'slunce' ? <p className="text-sm font-bold leading-snug text-[#c2410c]">Do Slunce se nikdy nedívej bez speciálních brýlí na zatmění.</p> : null}
            </div>
          ) : (
            <p className="text-sm font-bold leading-snug text-[#2f8fc4]">Vidíme jen půlku Měsíce otočenou k nám – v pohledu shora je obarvená modře.</p>
          )}
          {/* Zatmění nad fázemi, ať jsou karty vidět i když je rozbalené vysvětlení. */}
          <div className="pt-1">
            <p className="text-sm font-bold text-[#56628a] mb-2">Vyzkoušej si</p>
            <div className="grid grid-cols-2 gap-3">
              {(['slunce', 'mesic'] as const).map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={eclipse === e}
                  onClick={() => (eclipse === e ? setEclipse(null) : showEclipse(e))}
                  className="relative overflow-hidden rounded-2xl h-20 p-3 text-left text-white hover:-translate-y-0.5 transition-transform"
                  style={{ background: e === 'slunce' ? 'linear-gradient(135deg, #1b2350 0%, #0b0f24 100%)' : 'linear-gradient(135deg, #5a2a2a 0%, #1b1430 100%)', outline: eclipse === e ? '3px solid #f0a12c' : 'none', outlineOffset: 2 }}
                >
                  {e === 'slunce' ? (
                    <span className="absolute right-3 top-3 w-8 h-8 rounded-full bg-[#05070f]" style={{ boxShadow: '0 0 8px 3px rgba(255,255,255,.85), 0 0 20px 8px rgba(200,220,255,.35)' }} />
                  ) : (
                    <span className="absolute right-3 top-3 w-8 h-8 rounded-full" style={{ background: 'radial-gradient(circle at 40% 40%, #c8613f, #7a2a17 70%, #4a1a10)' }} />
                  )}
                  <span className="absolute left-3 bottom-2.5">
                    <span className="block text-base font-bold leading-tight">{ECLIPSE_INFO[e].name}</span>
                    <span className="block text-xs opacity-90">{eclipse === e ? 'zpět na fáze ←' : e === 'slunce' ? 'při novu →' : 'při úplňku →'}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-1">
            <p className="text-sm font-bold text-[#56628a] mb-2">Fáze Měsíce</p>
            <div className="grid grid-cols-4 gap-2">
              {MOON_PHASE_INFO.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  aria-current={!eclipse && i === idx}
                  title={p.book ? 'Tuhle fázi žáci lepí do knížky v učebnici' : undefined}
                  onClick={() => jump(p.at)}
                  className="flex flex-col items-center gap-1 rounded-2xl py-2 px-1 text-xs leading-tight text-center transition-colors"
                  style={{ background: !eclipse && i === idx ? '#fde9c6' : '#f4f6fb', fontWeight: p.book ? 700 : 500, color: p.book ? '#0f1d4d' : '#7a84a3' }}
                >
                  <img src={thumbs[i]} alt="" className="w-11 h-11" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
