/**
 * Prvoukové minihry v registru Miniher. Data a generátory úloh jsou v `./data`
 * (stejné jako v aplikaci Vividbooks Ultra), tady jen napojení na rozcestník
 * a konfigurátor.
 */
import { PRVOUKA_GAMES, defaultPrvoukaTopics } from './data/catalog';
import type { PrvoukaGrade } from './data/types';

const ILLUSTRATIONS = 'https://qypiuvqglsmxdsnyazih.supabase.co/storage/v1/object/public/platform-shared/laiout-illustrations/assets';

export type PrvoukaGameType =
  | 'prvoukaZvirata' | 'prvoukaOvoce' | 'prvoukaHodiny' | 'prvoukaRokDen' | 'prvoukaBezpecnost'
  | 'prvoukaVesmir' | 'prvoukaMesic' | 'prvoukaPodminky' | 'prvoukaSymboly' | 'prvoukaZeme'
  | 'prvoukaModelSoustava' | 'prvoukaModelMesic' | 'prvoukaHvezdy';

export interface PrvoukaLandingGame {
  id: PrvoukaGameType;
  /** Id hry v `data/catalog.ts`. */
  dataId: string;
  name: string;
  /** Krátký popis na kartě (malým písmenem, jako u matematiky). */
  description: string;
  /** Delší popis v konfigurátoru. */
  longDescription: string;
  icon: string;
  /** Pastelová barva karty a pozadí konfigurátoru. */
  bg: string;
  /** Výchozí barva herní plochy (z nabídky pozadí Miniher). */
  playBg: string;
  /** Ilustrace z knihovny Laioutu pro kartu. */
  image: string;
  /** Výřez obrázku na kartě (`object-position`), když střed usekne hlavu. */
  imagePosition?: string;
  /** Čtvercová ikona do okna s nastavením – když by čtvercový výřez z karty motiv usekl. */
  iconImage?: string;
  /** Ročníky, které konfigurátor nabídne (výchozí 1. a 2.). */
  grades?: PrvoukaGrade[];
  /** Interaktivní model místo kvízu (Sluneční soustava, fáze Měsíce). */
  model?: 'soustava' | 'mesic' | 'hvezdy';
}

const TRETAK = `${import.meta.env.BASE_URL}prvouka/tretak/karty`;
const TRETAK_IKONY = `${import.meta.env.BASE_URL}prvouka/tretak/ikony`;

export const PRVOUKA_LANDING_GAMES: PrvoukaLandingGame[] = [
  {
    id: 'prvoukaZvirata',
    dataId: 'zvirata',
    name: 'Poznávačka zvířat',
    description: 'kdo to je, kolik má nohou, kde žije a jak přečká zimu.',
    longDescription: 'Poznáváme zvířata z naší přírody i ze statku. Kolik mají nohou? Je to hmyz? Jak se jmenuje mládě a co dělá zvíře v zimě?',
    icon: '🐿️',
    bg: '#FFE5B4',
    playBg: '#F5E6D0',
    image: `${ILLUSTRATIONS}/prvouka-zlabatka-1300.png`,
  },
  {
    id: 'prvoukaOvoce',
    dataId: 'ovoce-zelenina',
    name: 'Ovoce a zelenina',
    description: 'třídíme úrodu do správné bedýnky.',
    longDescription: 'Obrázek se objeví nahoře a děti ho pošlou do správné bedýnky – ovoce, nebo zelenina? Ve 2. ročníku třídíme i plody dužnaté a suché.',
    icon: '🍎',
    bg: '#e0f2e6',
    playBg: '#E7F9EE',
    image: `${ILLUSTRATIONS}/ovoce-zelenina-1300.png`,
    imagePosition: 'center 15%',
  },
  {
    id: 'prvoukaHodiny',
    dataId: 'hodiny',
    name: 'Hodiny',
    description: 'čteme čas a nastavujeme ručičky.',
    longDescription: 'Kolik je hodin? Děti čtou ručičkové hodiny a samy táhnou za ručičky – celé hodiny, půl, čtvrt i tři čtvrtě. Ve 2. ročníku i digitální čas.',
    icon: '🕰️',
    bg: '#D0DBFF',
    playBg: '#D0DBFF',
    image: `${import.meta.env.BASE_URL}prvouka/hodiny-karta.svg`,
  },
  {
    id: 'prvoukaRokDen',
    dataId: 'rok-a-den',
    name: 'Rok a den',
    description: 'roční období, měsíce, svátky, týden i můj den.',
    longDescription: 'Orientujeme se v čase: kdy je jaké roční období, kdy jsou Vánoce a prázdniny, který den je po středě a kdy vstáváme, obědváme a spíme.',
    icon: '📅',
    bg: '#fcfbdc',
    playBg: '#FAF3D4',
    image: `${ILLUSTRATIONS}/podzim-zima-1300.png`,
  },
  {
    id: 'prvoukaBezpecnost',
    dataId: 'bezpecnost',
    name: 'Bezpečně venku',
    description: 'značky, přecházení, tísňová čísla a lékárnička.',
    longDescription: 'Dopravní značky ze sešitu, chodecký semafor, pravidla přecházení, komu zavolat v tísni (150, 155, 158, 112) a co patří do lékárničky.',
    icon: '🚸',
    bg: '#FFD3C5',
    playBg: '#FFE8ED',
    image: `${ILLUSTRATIONS}/prvouka-hriste-1300.png`,
    imagePosition: 'center 40%',
  },
  // 3. ročník, 1. díl – vesmír, podmínky pro život, naše republika
  {
    id: 'prvoukaModelSoustava',
    dataId: 'model-soustava',
    name: 'Model Sluneční soustavy',
    description: 'planety obíhají kolem Slunce – klepni a zjisti víc.',
    longDescription: 'Interaktivní model k promítnutí: Slunce a osm planet obíhají ve skutečném poměru rychlostí, s Měsícem, kometou a pásem planetek. Klepnutím na planetu se ukáže kartička z učebnice, přepínač ukáže skutečné velikosti.',
    icon: '🪐',
    bg: '#D0DBFF',
    playBg: '#060a1c',
    image: `${TRETAK}/model-soustava.jpg`,
    grades: [3],
    model: 'soustava',
  },
  {
    id: 'prvoukaModelMesic',
    dataId: 'model-mesic',
    name: 'Model fází Měsíce',
    description: 'proč Měsíc dorůstá a couvá.',
    longDescription: 'Vlevo pohled shora na Slunce, Zemi a Měsíc, vpravo jak Měsíc vidíme ze Země. Jezdcem projdete celý měsíc, tlačítko Dnes na obloze ukáže dnešní fázi. Nápověda D jako dorůstá, C jako couvá.',
    icon: '🌓',
    bg: '#D0DBFF',
    playBg: '#060a1c',
    image: `${TRETAK}/model-mesic.jpg`,
    grades: [3],
    model: 'mesic',
  },
  {
    id: 'prvoukaHvezdy',
    dataId: 'hvezdy',
    name: 'Souhvězdí',
    description: 'spoj hvězdy Velkého vozu a najdi Polárku.',
    longDescription: 'Na noční obloze děti spojují hvězdy Velkého vozu, Kasiopeji a Oriona a podle vozu najdou Polárku, která ukazuje sever. V režimu Prohlížet jsou souhvězdí nakreslená i s popisem k promítnutí.',
    icon: '✨',
    bg: '#D0DBFF',
    playBg: '#05081a',
    image: `${import.meta.env.BASE_URL}prvouka/hvezdy-karta.svg`,
    grades: [3],
    model: 'hvezdy',
  },
  {
    id: 'prvoukaVesmir',
    dataId: 'vesmir',
    name: 'Sluneční soustava',
    description: 'pořadí planet, poznávačka a vesmírná tělesa.',
    longDescription: 'Seřaď planety od Slunce, poznej planetu podle obrázku, urči, kde v soustavě leží, a pojmenuj vesmírná tělesa – mlhovinu, hvězdu, galaxii nebo černou díru.',
    icon: '🪐',
    bg: '#D0DBFF',
    playBg: '#E6ECFF',
    image: `${TRETAK}/vesmir.jpg`,
    grades: [3],
  },
  {
    id: 'prvoukaMesic',
    dataId: 'mesic',
    name: 'Fáze Měsíce',
    description: 'seřaď fáze, dorůstá, nebo couvá?',
    longDescription: 'Seřaď fáze Měsíce od novu, pojmenuj je a poznej, jestli Měsíc dorůstá, nebo couvá. Co uvidíme na obloze za týden?',
    icon: '🌓',
    bg: '#D0DBFF',
    playBg: '#E6ECFF',
    image: `${TRETAK}/mesic.jpg`,
    grades: [3],
  },
  {
    id: 'prvoukaPodminky',
    dataId: 'podminky',
    name: 'Podmínky pro život',
    description: 'slunce, voda, vzduch a živiny.',
    longDescription: 'Co potřebuje život na Zemi? Třídíme informace ke slunci, vodě, vzduchu a živinám a po pokusech rozhodujeme, co je pravda.',
    icon: '💧',
    bg: '#e0f2e6',
    playBg: '#E7F9EE',
    image: `${TRETAK}/podminky.jpg`,
    iconImage: `${TRETAK_IKONY}/podminky.png`,
    grades: [3],
  },
  {
    id: 'prvoukaSymboly',
    dataId: 'symboly',
    name: 'Státní symboly',
    description: 'znaky, vlajka, hymna a 28. října.',
    longDescription: 'Poznáš všech sedm státních symbolů? Kde je potkáš – na vysvědčení, na dresu, na radnici? A proč slavíme 28. října?',
    icon: '🇨🇿',
    bg: '#FFD3C5',
    playBg: '#FCEEEF',
    image: `${TRETAK}/symboly.jpg`,
    iconImage: `${TRETAK_IKONY}/symboly.png`,
    grades: [3],
  },
  {
    id: 'prvoukaZeme',
    dataId: 'zeme',
    name: 'Země, nebo země?',
    description: 'velké, nebo malé Z.',
    longDescription: 'Planeta Země se píše s velkým Z, půda, zem pod nohama i stát s malým z. Doplň písmeno do věty a urči, co slovo znamená.',
    icon: '🌍',
    bg: '#fcfbdc',
    playBg: '#FAF3D4',
    image: `${TRETAK}/zeme.jpg`,
    iconImage: `${TRETAK_IKONY}/zeme.png`,
    grades: [3],
  },
];

export const PRVOUKA_GAME_TYPES = PRVOUKA_LANDING_GAMES.map((game) => game.id);

export function prvoukaLandingGame(id: string): PrvoukaLandingGame | undefined {
  return PRVOUKA_LANDING_GAMES.find((game) => game.id === id);
}

/** Skupiny na rozcestníku prvouky (jako „Poznávám čísla“ u matematiky). */
export const PRVOUKA_GAME_GROUPS: Array<{ title: string; games: PrvoukaGameType[] }> = [
  { title: 'Poznávám přírodu', games: ['prvoukaZvirata', 'prvoukaOvoce'] },
  { title: 'Orientace v čase', games: ['prvoukaHodiny', 'prvoukaRokDen'] },
  { title: 'Bezpečí a zdraví', games: ['prvoukaBezpecnost'] },
  { title: '3. ročník: Vesmír a Země', games: ['prvoukaModelSoustava', 'prvoukaModelMesic', 'prvoukaHvezdy', 'prvoukaVesmir', 'prvoukaMesic', 'prvoukaPodminky'] },
  { title: '3. ročník: Naše republika', games: ['prvoukaSymboly', 'prvoukaZeme'] },
];

/** Nastavení pro konfigurátor: ročník, témata, počet úloh, pozadí. */
export function prvoukaGameSettings(game: PrvoukaLandingGame, backgroundSettings: Record<string, any>) {
  if (game.model === 'soustava') {
    return {
      view: {
        name: 'Pohled na začátku',
        type: 'select' as const,
        defaultValue: 'orbit',
        options: [
          { value: 'orbit', label: 'Oběžné dráhy' },
          { value: 'size', label: 'Skutečné velikosti' },
        ],
        description: 'Mezi pohledy jde přepínat i během promítání',
      },
      style: {
        name: 'Vzhled planet',
        type: 'select' as const,
        defaultValue: 'realny',
        options: [
          { value: 'realny', label: 'Opravdový (fotografie NASA)' },
          { value: 'kresleny', label: 'Kreslený' },
        ],
        description: 'Přepnout jde i během promítání',
      },
      labels: { name: 'Popisky planet', type: 'boolean' as const, defaultValue: true, description: 'Jména planet u modelu' },
    };
  }
  if (game.model === 'hvezdy') {
    return {
      mode: {
        name: 'Začít v režimu',
        type: 'select' as const,
        defaultValue: 'hra',
        options: [
          { value: 'hra', label: 'Hra' },
          { value: 'prohlizet', label: 'Prohlížet' },
        ],
        description: 'Přepnout jde i během hraní',
      },
    };
  }
  if (game.model === 'mesic') {
    return {
      hintDC: { name: 'Nápověda D / C', type: 'boolean' as const, defaultValue: true, description: 'U srpků a čtvrtí ukáže písmeno D (dorůstá) nebo C (couvá)' },
      startToday: { name: 'Začít dnešní fází', type: 'boolean' as const, defaultValue: false, description: 'Model se otevře s Měsícem, jak je dnes na obloze' },
    };
  }
  const data = PRVOUKA_GAMES.find((item) => item.id === game.dataId);
  const grades = game.grades ?? [1, 2];
  const topicOptions = (data?.topics ?? []).map((topic) => ({ value: topic.id, label: `${topic.label} (str. ${topic.pages})` }));
  return {
    ...backgroundSettings,
    backgroundColor: { ...backgroundSettings.backgroundColor, defaultValue: game.playBg },
    grade: {
      name: 'Ročník',
      type: 'select' as const,
      defaultValue: grades[0],
      options: grades.map((value) => ({ value, label: `${value}. ročník` })),
      description: 'Podle ročníku se volí obtížnost (např. hodiny po půlhodinách, nebo po pěti minutách)',
    },
    topics: {
      name: 'Co procvičujeme',
      type: 'multiselect' as const,
      defaultValue: data ? defaultPrvoukaTopics(data, grades[0]) : [],
      options: topicOptions,
      description: 'Témata podle stran pracovní učebnice prvouky (ročník/díl/strana)',
    },
    rounds: {
      name: 'Počet úloh',
      type: 'select' as const,
      defaultValue: 10,
      options: [
        { value: 5, label: '5 úloh' },
        { value: 10, label: '10 úloh' },
        { value: 15, label: '15 úloh' },
        { value: 20, label: '20 úloh' },
      ],
      description: 'Kolik úloh má jedno kolo (tři chyby a kolo končí)',
    },
  };
}
