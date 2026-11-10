import React, { useEffect, useMemo, useState } from 'react';
import { GameResultScreen } from '../components/GameResultScreen';
import { PrvoukaFeedbackOverlay } from './PrvoukaKit';

/**
 * Oblékni se podle počasí (Orientace v čase) – šatník jako v oblékačkách.
 * Uprostřed Sam, dole šatník po částech těla. Věc ze stejné části se vymění (mikina nahradí tričko…).
 * Venku je nějaké počasí; až je dítě hotové, klikne „Jdeme ven!“ a hra řekne, jestli je Sam oblečený
 * dobře – nebo vlídně, co ještě změnit. Volná hra (bez počasí) jde zapnout v nastavení.
 *
 * Ilustrace: Sam a oblečení z obrázků od autorky (public/prvouka/ill/obleceni). Sam je letní
 * (žluté tričko, kraťasy, sandály) – to je jeho základ, když v dané části nic jiného nemá.
 * sam.png leží v rámečku 204 × 392 na pozici 15,10 (174 × 382).
 */

const INK = '#2a3a8c';
const ART = `${import.meta.env.BASE_URL}prvouka/ill/obleceni`;

type Slot = 'hlava' | 'krk' | 'vrsek' | 'bunda' | 'dolu' | 'boty' | 'ruce' | 'destnik';
interface Piece { src: string; box: [number, number, number, number]; z: number }
interface Item { id: string; name: string; slot: Slot; pieces: Piece[]; thumb: string; /** vlastní poloha pro druhou postavu (když přepočet nestačí – třeba klobouk na Samovy kudrny) */ boxFor?: Partial<Record<'sam' | 'hanka', [number, number, number, number]>>; srcFor?: Partial<Record<'sam' | 'hanka', string>>; /** jen pro vlastní postavu – na druhé nevypadá dobře (kapuce pláštěnky na Samovy kudrny) */ ownOnly?: boolean }

// Pozice v rámečku 204 × 392 px (výřez z obrázku s oblečenými postavami). „nas-…“ jsou věci vystřižené
// přímo z oblečeného Sama, takže sedí přesně; ostatní (tričko, šála, holínky, deštník) jsou ploché kusy.
const ITEMS: Item[] = [
  { id: 'cepice', name: 'Čepice', slot: 'hlava', thumb: 'cepice', pieces: [{ src: 'nas-cepice', box: [13, 0, 185, 105], z: 9 }] },
  { id: 'sala', name: 'Šála', slot: 'krk', thumb: 'sala', pieces: [{ src: 'sala', box: [59, 162, 151, 256], z: 8 }] },
  { id: 'zlute-triko', name: 'Žluté tričko', slot: 'vrsek', thumb: 'zlute-triko', pieces: [] },
  { id: 'mikina', name: 'Mikina', slot: 'vrsek', thumb: 'mikina', pieces: [{ src: 'nas-mikina', box: [21, 157, 190, 298], z: 4 }] },
  { id: 'bunda', name: 'Bunda se svetrem', slot: 'vrsek', thumb: 'bunda', pieces: [{ src: 'nas-bunda', box: [17, 147, 195, 303], z: 6 }] },
  { id: 'zimni-bunda', name: 'Zimní bunda', slot: 'vrsek', thumb: 'zimni-bunda', pieces: [{ src: 'nas-zimni-bunda', box: [16, 127, 197, 313], z: 6 }] },
  { id: 'kratasy', name: 'Kraťasy', slot: 'dolu', thumb: 'kratasy', pieces: [] },
  { id: 'dziny', name: 'Džíny', slot: 'dolu', thumb: 'dziny', pieces: [{ src: 'nas-dziny', box: [36, 258, 173, 375], z: 2 }] },
  { id: 'kalhoty', name: 'Kalhoty', slot: 'dolu', thumb: 'kalhoty', pieces: [{ src: 'nas-kalhoty', box: [23, 258, 189, 368], z: 2 }] },
  { id: 'leginy', name: 'Legíny', slot: 'dolu', thumb: 'leginy', pieces: [{ src: 'nas-leginy', box: [23, 258, 189, 368], z: 2 }] },
  { id: 'zimni-kalhoty', name: 'Zimní kalhoty', slot: 'dolu', thumb: 'nas-zimni-kalhoty', pieces: [{ src: 'nas-zimni-kalhoty', box: [44, 258, 170, 363], z: 2 }] },
  { id: 'sandaly', name: 'Sandály', slot: 'boty', thumb: 'sandaly', pieces: [] },
  { id: 'tenisky', name: 'Tenisky', slot: 'boty', thumb: 'tenisky', pieces: [{ src: 'nas-tenisky', box: [36, 357, 173, 389], z: 3 }] },
  { id: 'boty', name: 'Kotníkové boty', slot: 'boty', thumb: 'boty', pieces: [{ src: 'nas-boty', box: [29, 352, 190, 392], z: 3 }] },
  { id: 'holinky', name: 'Holínky', slot: 'boty', thumb: 'holinky', pieces: [{ src: 'holinky', box: [38, 290, 176, 393], z: 3 }] },
  { id: 'zimni-boty', name: 'Zimní boty', slot: 'boty', thumb: 'zimni-boty', pieces: [{ src: 'nas-zimni-boty', box: [20, 307, 186, 392], z: 3 }] },
  { id: 'palcaky', name: 'Palčáky', slot: 'ruce', thumb: 'palcak-l', pieces: [{ src: 'ruka-palcak-l', box: [18, 248, 64, 308], z: 7 }, { src: 'ruka-palcak-p', box: [146, 248, 192, 308], z: 7 }] },
  { id: 'destnik', name: 'Deštník', slot: 'destnik', thumb: 'destnik', pieces: [{ src: 'destnik', box: [161, 118, 277, 282], z: 10 }] },
];
// Hanka: rámeček 240 × 495 px, obrázky v hanka/ („f-…“ jsou ploché kusy jen na náhled v šatníku).
const H_ITEMS: Item[] = [
  { id: 'cepice', name: 'Čepice', slot: 'hlava', thumb: 'hanka/cepice', pieces: [{ src: 'hanka/cepice', box: [45, 5, 191, 126], z: 9 }] },
  { id: 'cervene-triko', name: 'Červené tričko', slot: 'vrsek', thumb: 'hanka/f-triko', pieces: [] },
  { id: 'saty', name: 'Šaty', slot: 'vrsek', thumb: 'hanka/f-saty', pieces: [{ src: 'hanka/f-saty', box: [50, 196, 190, 398], z: 4 }], boxFor: { sam: [30, 148, 180, 350] } },
  { id: 'plastenka', name: 'Pláštěnka', slot: 'vrsek', thumb: 'hanka/plastenka', pieces: [{ src: 'hanka/plastenka', box: [12, 30, 222, 379], z: 6 }], ownOnly: true },
  { id: 'zimni-bunda', name: 'Zimní bunda', slot: 'vrsek', thumb: 'hanka/f-zimni-bunda', pieces: [{ src: 'hanka/f-zimni-bunda', box: [20, 166, 218, 360], z: 6 }] },
  { id: 'kratasy', name: 'Kraťasy', slot: 'dolu', thumb: 'hanka/f-kratasy', pieces: [] },
  { id: 'tenisky', name: 'Tenisky', slot: 'boty', thumb: 'hanka/f-tenisky', pieces: [] },
  { id: 'sandaly', name: 'Sandály', slot: 'boty', thumb: 'hanka/f-sandaly', pieces: [{ src: 'hanka/sandaly', box: [30, 398, 212, 490], z: 3 }] },
  { id: 'boty', name: 'Kotníkové boty', slot: 'boty', thumb: 'hanka/boty', pieces: [{ src: 'hanka/boty', box: [45, 409, 196, 495], z: 3 }] },
  { id: 'holinky', name: 'Holínky', slot: 'boty', thumb: 'hanka/f-holinky', pieces: [{ src: 'hanka/f-holinky', box: [52, 390, 192, 492], z: 3 }] },
  { id: 'zimni-boty', name: 'Zimní boty', slot: 'boty', thumb: 'hanka/f-zimni-boty', pieces: [{ src: 'hanka/zimni-boty', box: [48, 394, 188, 486], z: 3 }] },
  { id: 'palcaky', name: 'Palčáky', slot: 'ruce', thumb: 'hanka/f-palcaky', pieces: [{ src: 'hanka/palcaky', box: [17, 299, 220, 371], z: 7 }] },
  { id: 'destnik', name: 'Deštník', slot: 'destnik', thumb: 'hanka/f-destnik', pieces: [{ src: 'hanka/f-destnik', box: [176, 150, 296, 296], z: 10 }], boxFor: { sam: [122, 186, 196, 284] } },
];
type Who = 'sam' | 'hanka';
/**
 * Přepočet pozic ze Samova rámečku do Hančina (a zpátky). Každá část těla zvlášť – hlava podle očí,
 * trup podle trička, kalhoty od pasu ke kotníkům, boty od chodidel – ať věci sedí, i když má Hanka
 * jinak velkou hlavu a delší nohy. Čísla jsou změřená na základních obrázcích obou dětí.
 */
type Lin = { sx: number; cx: number; hx: number; sy: number; cy: number; hy: number };
const GROUP: Record<Slot, Lin> = {
  hlava: { sx: 1.05, cx: 102, hx: 120, sy: 1.05, cy: 128, hy: 145 },
  krk: { sx: 1.05, cx: 102, hx: 120, sy: 1.05, cy: 128, hy: 145 },
  vrsek: { sx: 1.2, cx: 105, hx: 120, sy: 1.2, cy: 163, hy: 207 },
  bunda: { sx: 1.2, cx: 105, hx: 120, sy: 1.2, cy: 163, hy: 207 },
  ruce: { sx: 1.2, cx: 105, hx: 120, sy: 1.2, cy: 163, hy: 207 },
  destnik: { sx: 1.2, cx: 105, hx: 120, sy: 1.2, cy: 163, hy: 207 },
  dolu: { sx: 1.06, cx: 104, hx: 120, sy: 1.06, cy: 262, hy: 322 },
  boty: { sx: 1.06, cx: 104, hx: 120, sy: 1.06, cy: 392, hy: 481 },
};
function mapBox(box: [number, number, number, number], slot: Slot, from: Who, to: Who): [number, number, number, number] {
  if (from === to) return box;
  const m = GROUP[slot];
  const f = from === 'sam'
    ? (x: number, y: number) => [m.hx + (x - m.cx) * m.sx, m.hy + (y - m.cy) * m.sy]
    : (x: number, y: number) => [m.cx + (x - m.hx) / m.sx, m.cy + (y - m.hy) / m.sy];
  const [x0, y0] = f(box[0], box[1]); const [x1, y1] = f(box[2], box[3]);
  return [x0, y0, x1, y1];
}
/** Postavy: rámeček, základní obrázek (a jeho varianty bez kraťasů pod dlouhými kalhotami), šatník a co má na sobě vždycky. */
const CHARS: Record<Who, { kdo: string; komu: string; koho: string; w: number; h: number; base: string; baseBox: [number, number, number, number]; longPants: string[]; items: Item[]; baseIds: Partial<Record<Slot, string>> }> = {
  sam: { kdo: 'Sam', komu: 'Samovi', koho: 'Sama', w: 204, h: 392, base: 'sam', baseBox: [15, 10, 189, 392], longPants: [], items: ITEMS, baseIds: { vrsek: 'zlute-triko', dolu: 'kratasy', boty: 'sandaly' } },
  hanka: { kdo: 'Hanka', komu: 'Hance', koho: 'Hanku', w: 240, h: 495, base: 'hanka/hanka', baseBox: [3, 35, 236, 481], longPants: [], items: H_ITEMS, baseIds: { vrsek: 'cervene-triko', dolu: 'kratasy' } },
};
// Šatník ve dvou sloupcích, ať se celá hra vejde na obrazovku: „Nahoru“ přes celou šířku.
const SHELVES: Array<{ title: string; slots: Slot[]; wide?: boolean }> = [
  { title: 'Na hlavu a krk', slots: ['hlava', 'krk'] },
  { title: 'Na ruce a do ruky', slots: ['ruce', 'destnik'] },
  { title: 'Nahoru', slots: ['vrsek', 'bunda'], wide: true },
  { title: 'Dolů', slots: ['dolu'] },
  { title: 'Na nohy', slots: ['boty'] },
];

type Outfit = Partial<Record<Slot, string>>;
type WeatherId = 'prsi' | 'snezi' | 'horko' | 'fouka';
interface Names { kdo: string; komu: string; koho: string }
interface Weather { id: WeatherId; label: string; sky: string; temp: string; ask: (n: Names) => string; bg: string; done: (n: Names) => string; check: (o: Outfit, n: Names) => string | null; tip?: (o: Outfit, n: Names) => string | null }

// Co má postava na sobě vždycky (Sam žluté tričko, kraťasy, sandály) – vybrat to je totéž jako nic.
/** Bundy a pláštěnka jsou ve stejné části jako trička (nahoru se vybírá jen jedna věc), kontrola je ale bere jako bundu. */
/** Co má postava na sobě od začátku – v šatníku je to rovnou označené. */
const WEARS: Record<'sam' | 'hanka', Partial<Record<Slot, string>>> = { sam: { vrsek: 'zlute-triko', dolu: 'kratasy', boty: 'sandaly' }, hanka: { vrsek: 'cervene-triko', dolu: 'kratasy', boty: 'tenisky' } };
const JACKETS = ['bunda', 'zimni-bunda', 'plastenka'];
const norm = (o: Outfit, who: Who): Outfit => { const b = CHARS[who].baseIds; const r: Outfit = { ...o }; (Object.keys(b) as Slot[]).forEach((k) => { if (r[k] === b[k]) r[k] = undefined; }); if (who === 'hanka' && !r.boty) r.boty = 'tenisky'; if (r.vrsek && JACKETS.includes(r.vrsek)) { r.bunda = r.vrsek; r.vrsek = undefined; } return r; };
const warmTop = (o: Outfit) => o.vrsek === 'mikina' || Boolean(o.bunda);
const WEATHER: Record<WeatherId, Weather> = {
  snezi: {
    id: 'snezi', label: '❄️ Sněží', sky: '🌨️', temp: '−5 °C', bg: '#e6eef8', ask: (n) => `Venku sněží a mrzne. Obleč ${n.koho} ven!`, done: (n) => `${n.kdo} je ${n.kdo === 'Hanka' ? 'teple oblečená' : 'teple oblečený'} a může ven do sněhu.`,
    check: (o, n) =>
      o.bunda !== 'zimni-bunda' ? `V mrazu potřebuje ${n.kdo} zimní bundu.`
      : !o.dolu ? `Bez dlouhých kalhot by ${n.komu} byla v mrazu zima. Vyber dlouhé kalhoty.`
      : o.boty !== 'zimni-boty' ? `Do sněhu se hodí zimní boty, v jiných by ${n.komu} byla zima na nohy.`
      : o.hlava !== 'cepice' ? `Bez zimní čepice by ${n.komu} byla zima na uši.`
      : null,
    // Palčáky nejsou chyba – jen rada na příště.
    tip: (o) => (!o.ruce ? 'Příště si vezmi i palčáky. V nich můžeš stavět sněhuláka a nebude ti zima na ruce.' : null),
  },
  prsi: {
    id: 'prsi', label: '🌧️ Prší', sky: '🌧️', temp: '12 °C', bg: '#cfdcea', ask: (n) => `Venku prší. Obleč ${n.koho} ven!`, done: () => `Můžeš vyrazit ven do deště!`,
    check: (o, n) =>
      !o.boty || o.boty === 'sandaly' ? `V sandálech by ${n.komu} v dešti zmokly nohy. Vyber boty.`
      : !o.dolu ? `Bez dlouhých kalhot by ${n.komu} při 12 °C byla zima.`
      : !warmTop(o) ? `Při 12 °C je v tričku zima. Dej ${n.komu} mikinu nebo bundu.`
      : o.bunda === 'zimni-bunda' ? `Zimní bunda je na déšť moc teplá. Stačí obyčejná bunda nebo pláštěnka.`
      : null,
    // Deštník není chyba – jen rada na příště.
    tip: (o) => {
      const miss = [!o.destnik ? 'deštník' : null, o.boty !== 'holinky' ? 'holínky' : null].filter(Boolean);
      return miss.length ? `Příště si vezmi i ${miss.join(' a ')}, ať nezmokneš.` : null;
    },
  },
  horko: {
    id: 'horko', label: '☀️ Horko', sky: '☀️', temp: '30 °C', bg: '#fdf0c8', ask: (n) => `Je léto a pořádné horko. Obleč ${n.koho} ven!`, done: (n) => `${n.komu} je příjemně. A nezapomeň pít!`,
    check: (o, n) =>
      o.bunda ? `V bundě by ${n.komu} bylo v horku strašné horko.`
      : o.vrsek === 'mikina' ? `Mikina je na léto moc teplá. Stačí tričko.`
      : o.dolu ? `V dlouhých kalhotách je v horku vedro. Kraťasy jsou lepší.`
      : o.hlava === 'cepice' ? `Zimní čepice v létě nepatří.`
      : o.krk ? `Šála v horku nepatří, zahřívá.`
      : o.ruce ? `Palčáky v létě nepotřebuješ.`
      : o.boty === 'zimni-boty' || o.boty === 'holinky' ? `V takových botách by se nohy v horku zapotily. Sandály jsou lepší.`
      : null,
  },
  fouka: {
    id: 'fouka', label: '🌬️ Fouká', sky: '🌬️', temp: '10 °C', bg: '#dbe8ee', ask: (n) => `Je podzim a hodně fouká. Obleč ${n.koho} ven!`, done: (n) => `Vítr teď ${n.komu} nevadí.`,
    check: (o, n) =>
      o.destnik ? `V silném větru by se deštník obrátil naruby.`
      : !o.dolu ? `Při 10 °C a ve větru je bez dlouhých kalhot zima.`
      : !warmTop(o) ? `Ve větru je v tričku zima. Dej ${n.komu} mikinu nebo bundu.`
      : !o.boty || o.boty === 'sandaly' ? `V sandálech by byla zima na nohy. Vyber pevné boty.`
      : o.bunda === 'zimni-bunda' ? `Zimní bunda je na podzim moc teplá.`
      : null,
  },
};
interface Worn extends Item { owner: Who }
function wardrobe(who: Who): Worn[] {
  const mine = CHARS[who].items.map((i) => ({ ...i, owner: who }));
  const otherWho: Who = who === 'sam' ? 'hanka' : 'sam';
  const ids = new Set(mine.map((i) => i.id));
  const theirs = CHARS[otherWho].items.filter((i) => !ids.has(i.id) && i.pieces.length > 0 && !i.ownOnly).map((i) => ({ ...i, owner: otherWho }));
  const order = ['hlava', 'krk', 'vrsek', 'bunda', 'dolu', 'boty', 'ruce', 'destnik'];
  return [...mine, ...theirs].sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
}
const ALL: WeatherId[] = ['prsi', 'snezi', 'horko', 'fouka'];
/** Opačný úkol: postava je už oblečená a dítě hádá, jaké je venku počasí. */
const PRESET: Record<WeatherId, Record<Who, Outfit>> = {
  snezi: { sam: { hlava: 'cepice', krk: 'sala', vrsek: 'zimni-bunda', dolu: 'zimni-kalhoty', boty: 'zimni-boty', ruce: 'palcaky' }, hanka: { hlava: 'cepice', krk: 'sala', vrsek: 'zimni-bunda', dolu: 'zimni-kalhoty', boty: 'zimni-boty', ruce: 'palcaky' } },
  prsi: { sam: { vrsek: 'bunda', dolu: 'dziny', boty: 'holinky', destnik: 'destnik' }, hanka: { vrsek: 'plastenka', dolu: 'leginy', boty: 'holinky', destnik: 'destnik' } },
  horko: { sam: {}, hanka: { vrsek: 'saty', boty: 'sandaly' } },
  fouka: { sam: { vrsek: 'mikina', dolu: 'kalhoty', boty: 'boty' }, hanka: { vrsek: 'mikina', dolu: 'kalhoty', boty: 'boty' } },
};
type Task = 'oblekni' | 'hadej';

export function PrvoukaObleceni({ settings = {} }: { settings?: Record<string, any> }) {
  const free = false; // jen podle počasí (volná hra se v nastavení nenabízí)
  const chosen: WeatherId[] = (Array.isArray(settings.weather) && settings.weather.length ? settings.weather : ALL).filter((x: string) => (ALL as string[]).includes(x));
  const rounds = useMemo(() => (chosen.length ? chosen : ALL), [chosen.join()]);
  const taskSetting: 'oblekni' | 'hadej' | 'oboji' = settings.task === 'oblekni' || settings.task === 'hadej' ? settings.task : 'oboji';
  const kinds: Task[] = rounds.map((_, i) => (taskSetting === 'oboji' ? (i % 2 ? 'hadej' : 'oblekni') : taskSetting));
  const [who, setWho] = useState<Who>('sam');
  /** poměr výška/šířka každého obrázku – kvůli schování nohavic do vysokých bot */
  const [nat, setNat] = useState<Record<string, number>>({});
  // Všechny obrázky načíst hned na začátku, ať se oblečení neobjevuje po kouskách.
  useEffect(() => {
    const srcs = new Set<string>();
    (['sam', 'hanka'] as Who[]).forEach((w) => {
      const c = CHARS[w];
      ['', '-dlouhe', '-bezbot', '-dlouhe-bezbot'].forEach((v) => srcs.add(`${c.base}${v}`));
      c.items.forEach((it) => { srcs.add(it.thumb); it.pieces.forEach((p) => srcs.add(p.src)); if (it.srcFor?.sam) srcs.add(it.srcFor.sam); });
    });
    srcs.forEach((src) => { const im = new Image(); im.onload = () => setNat((n) => ({ ...n, [src]: im.naturalHeight / im.naturalWidth })); im.src = `${ART}/${src}.png`; });
  }, []);
  const C = CHARS[who];
  const [ri, setRi] = useState(0);
  const [outfit, setOutfit] = useState<Outfit>({});
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; hint?: string; info?: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [clean, setClean] = useState(0);
  const W = WEATHER[rounds[ri] ?? 'prsi'];
  const kind: Task = kinds[ri] ?? 'oblekni';
  const guess = kind === 'hadej';
  // Hádací kolo: postava (střídavě Sam a Hanka) je rovnou oblečená podle počasí.
  useEffect(() => {
    if (kinds[ri] !== 'hadej') return;
    const w: Who = ri % 4 === 1 ? 'hanka' : 'sam';
    setWho(w); setOutfit(PRESET[rounds[ri]][w]);
  }, [ri]);
  const pickWeather = (id: WeatherId) => {
    if (feedback) return;
    if (id === W.id) {
      if (mistakes === 0) setClean((c) => c + 1);
      setFeedback({ isCorrect: true, info: `Ano! ${W.label.replace(/^\S+\s/, '')} – ${W.temp}.` });
    } else {
      setMistakes((m) => m + 1);
      setFeedback({ isCorrect: false, hint: WEATHER[id].check(norm(outfit, who), C) ?? 'Podívej se, co má na sobě.' });
    }
  };

  // Základní věc (tričko, kraťasy, sandály…) nejde „svléknout“ – kliknutí na ni jen vrátí základ.
  const toggle = (it: Item) => setOutfit((o) => ({ ...o, [it.slot]: o[it.slot] === it.id || WEARS[who][it.slot] === it.id ? undefined : it.id }));
  const goOut = () => {
    const problem = W.check(norm(outfit, who), C);
    if (problem) { setMistakes((m) => m + 1); setFeedback({ isCorrect: false, hint: problem }); return; }
    if (mistakes === 0) setClean((c) => c + 1);
    const tip = W.tip?.(norm(outfit, who), C);
    setFeedback({ isCorrect: true, info: tip ? `${W.done(C)} ${tip}` : W.done(C) });
  };
  const afterFeedback = () => {
    const ok = feedback?.isCorrect;
    setFeedback(null);
    if (!ok) return;
    if (ri + 1 >= rounds.length) setFinished(true);
    else { setRi((x) => x + 1); setOutfit({}); setMistakes(0); }
  };
  const restart = () => { setFinished(false); setClean(0); setRi(0); setOutfit({}); setMistakes(0); };

  const items = useMemo(() => wardrobe(who), [who]);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const worn = (Object.values(outfit).filter(Boolean) as string[]).map((id) => byId[id]).filter(Boolean);
  // Základní boty (Sam sandály, Hanka tenisky) pod jinými botami zmizí.
  const noShoes = Boolean(outfit.boty) && outfit.boty !== (who === 'hanka' ? 'tenisky' : 'sandaly');
  const longPants = Boolean(outfit.dolu) && outfit.dolu !== 'kratasy';
  const baseSrc = (longPants ? (C.longPants.includes(outfit.dolu!) ? `${C.base}-${outfit.dolu}` : `${C.base}-dlouhe`) : C.base) + (noShoes ? '-bezbot' : '');
  const [bx0, by0, bx1, by1] = C.baseBox;
  // Vysoké boty (holínky, zimní boty): nohavice se schovají do bot, ať nevykukují vedle nich.
  const tuck = outfit.boty === 'holinky' || outfit.boty === 'zimni-boty' ? (who === 'sam' ? 326 : 412) : 0;

  return (
    <div className="w-full min-h-full md:h-[calc(100dvh-104px)] md:min-h-0 md:overflow-hidden flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4" style={{ background: '#e3eefc' }}>
      <h2 className="text-xl md:text-2xl font-bold text-center flex-shrink-0" style={{ color: INK }}>{guess ? `${C.kdo} se oblékl${who === 'hanka' ? 'a' : ''} ven. Jaké je venku počasí?` : W.ask(C)}</h2>
      <div className="w-full max-w-6xl flex-1 min-h-0 grid gap-3 md:grid-cols-[minmax(260px,0.75fr)_minmax(480px,1.6fr)] items-stretch">
        {/* Postava a počasí */}
        <div className="relative rounded-3xl overflow-hidden flex flex-col items-center min-h-[420px] md:min-h-0" style={{ background: guess ? '#eef3fb' : W.bg, border: `2px solid ${INK}22` }}>
          {!guess ? (
            <div className="absolute left-4 top-3 flex items-center gap-2 rounded-2xl bg-white/85 px-3 py-1.5" style={{ color: INK }}>
              <span className="text-3xl leading-none">{W.sky}</span>
              <span className="text-base md:text-lg font-bold">{W.temp}</span>
            </div>
          ) : null}
          {!free && rounds.length > 1 ? (
            <div className="absolute right-4 top-3 rounded-full bg-white/85 px-3 py-1.5 text-sm font-bold tabular-nums" style={{ color: INK }}>{ri + 1} / {rounds.length}</div>
          ) : null}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center pt-14 pb-2">
          <div className="relative h-full max-h-[620px]" style={{ aspectRatio: `${C.w} / ${C.h}` }}>
            <img src={`${ART}/${baseSrc}.png`} alt={C.kdo} className="absolute" style={{ left: `${(bx0 / C.w) * 100}%`, top: `${(by0 / C.h) * 100}%`, width: `${((bx1 - bx0) / C.w) * 100}%`, height: `${((by1 - by0) / C.h) * 100}%` }} draggable={false} />
            {worn.flatMap((it) => it.pieces.map((p, i) => {
              const [x0, y0, x1, y1] = (it.owner !== who && it.boxFor?.[who] && it.pieces.length === 1) ? it.boxFor[who]! : mapBox(p.box, it.slot, it.owner, who);
              // Kalhoty z druhé postavy se natáhnou podle délky nohou (Hanka má delší nohy než Sam).
              const stretchLegs = it.slot === 'dolu' && it.owner !== who && !it.boxFor?.[who];
              return (
                <img key={it.id + i} src={`${ART}/${(it.owner !== who && it.srcFor?.[who]) || p.src}.png`} alt="" draggable={false} className="absolute"
                  style={{ left: `${(x0 / C.w) * 100}%`, ...(it.slot === 'boty' ? { bottom: `${(1 - y1 / C.h) * 100}%` } : { top: `${(y0 / C.h) * 100}%` }), width: `${((x1 - x0) / C.w) * 100}%`, height: stretchLegs ? `${((y1 - y0) / C.h) * 100}%` : 'auto', zIndex: p.z, animation: 'oblIn .3s ease', ...(it.slot === 'dolu' && tuck && (stretchLegs || nat[p.src]) ? (() => { const h = stretchLegs ? y1 - y0 : (x1 - x0) * nat[p.src]; return { clipPath: `inset(0 0 ${Math.max(0, ((y0 + h - tuck) / h) * 100)}% 0)` }; })() : {}) }} />
              );
            }))}
          </div>
          </div>
          <div className="flex gap-2 pb-3 flex-shrink-0">
            {!guess ? (
              <button type="button" onClick={goOut} className="h-11 px-6 rounded-full text-base font-bold text-white shadow" style={{ background: '#4f46e5' }}>Jdeme ven! →</button>
            ) : null}
          </div>
        </div>
        {guess ? (
          <div className="grid grid-cols-2 gap-3 content-center">
            {ALL.filter((id) => rounds.includes(id) || true).map((id) => (
              <button key={id} type="button" onClick={() => pickWeather(id)}
                className="rounded-3xl p-4 flex flex-col items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                style={{ background: WEATHER[id].bg, border: `3px solid ${INK}22`, minHeight: 'clamp(120px, 24vh, 220px)' }}>
                <span className="leading-none" style={{ fontSize: 'clamp(40px, 8vh, 80px)' }}>{WEATHER[id].sky}</span>
                <span className="text-lg md:text-xl font-bold" style={{ color: INK }}>{WEATHER[id].label.replace(/^\S+\s/, '')}</span>
                <span className="text-sm font-bold" style={{ color: '#56628a' }}>{WEATHER[id].temp}</span>
              </button>
            ))}
          </div>
        ) : (
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <span className="text-sm font-bold" style={{ color: '#56628a' }}>Koho oblékáš?</span>
            {(['sam', 'hanka'] as Who[]).map((k) => (
              <button key={k} type="button" aria-pressed={who === k} onClick={() => { if (k !== who) { setWho(k); setOutfit({}); } }}
                className="h-10 pl-1.5 pr-4 rounded-full text-sm font-bold flex items-center gap-2 transition-colors"
                style={{ background: who === k ? '#4f46e5' : '#ffffff', color: who === k ? '#ffffff' : INK, border: `2px solid ${who === k ? '#4f46e5' : '#d6def0'}` }}>
                <span className="w-7 h-7 rounded-full overflow-hidden bg-white flex items-start justify-center"><img src={`${ART}/${CHARS[k].base}.png`} alt="" className="w-[140%] max-w-none -mt-0.5" /></span>
                {CHARS[k].kdo}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 content-start min-h-0 md:overflow-y-auto">
          {SHELVES.map((sh) => (
            <div key={sh.title} className={`rounded-2xl bg-white/70 p-2 ${sh.wide ? 'sm:col-span-2' : ''}`} style={{ border: `2px solid ${INK}1a` }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#56628a' }}>{sh.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.filter((it) => sh.slots.includes(it.slot)).map((it) => {
                  const on = outfit[it.slot] === it.id || (!outfit[it.slot] && WEARS[who][it.slot] === it.id);
                  return (
                    <button key={it.id} type="button" onClick={() => toggle(it)} aria-pressed={on}
                      className="flex flex-col items-center justify-end gap-0.5 rounded-xl bg-white p-1 transition-transform hover:-translate-y-0.5"
                      style={{ width: 'clamp(60px, 9.4vh, 100px)', height: 'clamp(64px, 10vh, 106px)', border: `2px solid ${on ? '#4f46e5' : '#d6def0'}`, boxShadow: on ? '0 0 0 3px #c7c4ff' : 'none' }}>
                      <img src={`${ART}/${it.thumb}.png`} alt="" className="object-contain" style={{ maxHeight: 'clamp(36px, 6vh, 64px)', maxWidth: '85%' }} draggable={false} />
                      <span className="text-[10px] xl:text-[11px] font-bold leading-tight text-center" style={{ color: INK }}>{it.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </div>
        )}
      </div>
      <style>{'@keyframes oblIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}'}</style>
      {feedback ? <PrvoukaFeedbackOverlay isCorrect={feedback.isCorrect} hint={feedback.hint} info={feedback.info} onComplete={afterFeedback} /> : null}
      {finished ? <GameResultScreen isSuccess onContinue={restart} successText="Výborně!" showContinueButton displayType="gameComplete" score={{ correct: clean, total: rounds.length }} /> : null}
    </div>
  );
}
