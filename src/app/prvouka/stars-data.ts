/**
 * Souhvězdí pro minihru Souhvězdí (3. ročník, vesmír).
 * Polohy hvězd jsou skutečné (rektascenze v hodinách, deklinace ve stupních, hvězdná velikost),
 * takže tvar i vzdálenosti na obrazovce odpovídají obloze. Hrany = čáry, které se kreslí.
 */

export interface SkyStar { id: string; name: string; ra: number; dec: number; mag: number; color?: string }
export interface Constellation {
  id: 'vuz' | 'maly-vuz' | 'kasiopeja' | 'labut' | 'lyra' | 'lev' | 'orion' | 'blizenci';
  name: string;
  stars: SkyStar[];
  edges: Array<[string, string]>;
  /** Pořadí ve hře (spojovačka podle čísel), jen u souhvězdí, která jsou ve hře. Hvězda může mít dvě čísla. */
  order?: string[];
  /** Krátký text do panelu (ověřená fakta). */
  text: string;
  /** Hvězdy, které mají v prohlížení popisek. */
  named?: string[];
}

export const POLARKA: SkyStar = { id: 'polarka', name: 'Polárka', ra: 2.530, dec: 89.26, mag: 2.0 };

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'vuz',
    name: 'Velký vůz',
    stars: [
      { id: 'dubhe', name: 'Dubhe', ra: 11.062, dec: 61.75, mag: 1.8 },
      { id: 'merak', name: 'Merak', ra: 11.031, dec: 56.38, mag: 2.4 },
      { id: 'phecda', name: 'Phecda', ra: 11.897, dec: 53.69, mag: 2.4 },
      { id: 'megrez', name: 'Megrez', ra: 12.257, dec: 57.03, mag: 3.3 },
      { id: 'alioth', name: 'Alioth', ra: 12.900, dec: 55.96, mag: 1.8 },
      { id: 'mizar', name: 'Mizar', ra: 13.399, dec: 54.93, mag: 2.2 },
      { id: 'alkaid', name: 'Alkaid', ra: 13.792, dec: 49.31, mag: 1.9 },
    ],
    edges: [['alkaid', 'mizar'], ['mizar', 'alioth'], ['alioth', 'megrez'], ['megrez', 'phecda'], ['phecda', 'merak'], ['merak', 'dubhe'], ['dubhe', 'megrez']],
    order: ['alkaid', 'mizar', 'alioth', 'megrez', 'phecda', 'merak', 'dubhe', 'megrez'],
    text: 'Sedm jasných hvězd ve tvaru vozu s ojí. Je to část velkého souhvězdí Velká medvědice. U nás ho vidíme na obloze po celý rok.',
  },
  {
    id: 'maly-vuz',
    name: 'Malý vůz',
    stars: [
      { id: 'polarka', name: 'Polárka', ra: 2.530, dec: 89.26, mag: 2.0 },
      { id: 'yildun', name: 'Yildun', ra: 17.537, dec: 86.59, mag: 4.4 },
      { id: 'umi-eps', name: 'ε', ra: 16.766, dec: 82.04, mag: 4.2 },
      { id: 'umi-zeta', name: 'ζ', ra: 15.734, dec: 77.79, mag: 4.3 },
      { id: 'kochab', name: 'Kochab', ra: 14.845, dec: 74.16, mag: 2.1 },
      { id: 'pherkad', name: 'Pherkad', ra: 15.346, dec: 71.83, mag: 3.0 },
      { id: 'umi-eta', name: 'η', ra: 16.292, dec: 75.76, mag: 5.0 },
    ],
    edges: [['polarka', 'yildun'], ['yildun', 'umi-eps'], ['umi-eps', 'umi-zeta'], ['umi-zeta', 'kochab'], ['kochab', 'pherkad'], ['pherkad', 'umi-eta'], ['umi-eta', 'umi-zeta']],
    text: 'Menší vůz, jehož oj končí Polárkou. Většina jeho hvězd svítí slabě, takže ve městě ho často nevidíme celý. Na obloze je po celý rok.',
    named: ['polarka'],
  },
  {
    id: 'kasiopeja',
    name: 'Kasiopeja',
    stars: [
      { id: 'caph', name: 'Caph', ra: 0.153, dec: 59.15, mag: 2.3 },
      { id: 'schedar', name: 'Schedar', ra: 0.675, dec: 56.54, mag: 2.2 },
      { id: 'navi', name: 'Navi', ra: 0.945, dec: 60.72, mag: 2.4 },
      { id: 'ruchbah', name: 'Ruchbah', ra: 1.430, dec: 60.24, mag: 2.7 },
      { id: 'segin', name: 'Segin', ra: 1.907, dec: 63.67, mag: 3.4 },
    ],
    edges: [['caph', 'schedar'], ['schedar', 'navi'], ['navi', 'ruchbah'], ['ruchbah', 'segin']],
    order: ['caph', 'schedar', 'navi', 'ruchbah', 'segin'],
    text: 'Pět hvězd ve tvaru písmene W – podle toho, jak je zrovna natočená, vypadá i jako M. Leží na druhé straně od Polárky než Velký vůz a u nás je vidět po celý rok.',
  },
  {
    id: 'labut',
    name: 'Labuť',
    stars: [
      { id: 'deneb', name: 'Deneb', ra: 20.690, dec: 45.28, mag: 1.3 },
      { id: 'sadr', name: 'Sadr', ra: 20.370, dec: 40.26, mag: 2.2 },
      { id: 'albireo', name: 'Albireo', ra: 19.512, dec: 27.96, mag: 3.1 },
      { id: 'gienah', name: 'Gienah', ra: 20.770, dec: 33.97, mag: 2.5 },
      { id: 'cyg-delta', name: 'δ', ra: 19.750, dec: 45.13, mag: 2.9 },
    ],
    edges: [['deneb', 'sadr'], ['sadr', 'albireo'], ['cyg-delta', 'sadr'], ['sadr', 'gienah']],
    text: 'Velký kříž z hvězd, proto se mu říká i Severní kříž. Nejjasnější hvězda je Deneb. Nejlépe ho uvidíme v létě.',
    named: ['deneb'],
  },
  {
    id: 'lyra',
    name: 'Lyra',
    stars: [
      { id: 'vega', name: 'Vega', ra: 18.616, dec: 38.78, mag: 0.0, color: '#dce9ff' },
      { id: 'lyr-zeta', name: 'ζ', ra: 18.746, dec: 37.61, mag: 4.3 },
      { id: 'lyr-delta', name: 'δ', ra: 18.908, dec: 36.90, mag: 4.3 },
      { id: 'sulafat', name: 'Sulafat', ra: 18.982, dec: 32.69, mag: 3.2 },
      { id: 'sheliak', name: 'Sheliak', ra: 18.835, dec: 33.36, mag: 3.5 },
    ],
    edges: [['vega', 'lyr-zeta'], ['lyr-zeta', 'lyr-delta'], ['lyr-delta', 'sulafat'], ['sulafat', 'sheliak'], ['sheliak', 'lyr-zeta']],
    text: 'Malé souhvězdí, ale s jednou z nejjasnějších hvězd na obloze – Vegou. V létě večer svítí vysoko nad hlavou.',
    named: ['vega'],
  },
  {
    id: 'lev',
    name: 'Lev',
    stars: [
      { id: 'regulus', name: 'Regulus', ra: 10.140, dec: 11.97, mag: 1.4 },
      { id: 'leo-eta', name: 'η', ra: 10.122, dec: 16.76, mag: 3.5 },
      { id: 'algieba', name: 'Algieba', ra: 10.333, dec: 19.84, mag: 2.0 },
      { id: 'leo-zeta', name: 'ζ', ra: 10.278, dec: 23.42, mag: 3.4 },
      { id: 'leo-mu', name: 'μ', ra: 9.879, dec: 26.01, mag: 3.9 },
      { id: 'leo-eps', name: 'ε', ra: 9.764, dec: 23.77, mag: 3.0 },
      { id: 'zosma', name: 'Zosma', ra: 11.235, dec: 20.52, mag: 2.6 },
      { id: 'chertan', name: 'Chertan', ra: 11.237, dec: 15.43, mag: 3.3 },
      { id: 'denebola', name: 'Denebola', ra: 11.818, dec: 14.57, mag: 2.1 },
    ],
    edges: [['regulus', 'leo-eta'], ['leo-eta', 'algieba'], ['algieba', 'leo-zeta'], ['leo-zeta', 'leo-mu'], ['leo-mu', 'leo-eps'], ['algieba', 'zosma'], ['zosma', 'denebola'], ['denebola', 'chertan'], ['chertan', 'regulus'], ['chertan', 'zosma']],
    text: 'Jarní souhvězdí. Hlavu lva tvoří hvězdy ve tvaru obráceného otazníku, nejjasnější z nich je Regulus.',
    named: ['regulus'],
  },
  {
    id: 'orion',
    name: 'Orion',
    stars: [
      { id: 'betelgeuze', name: 'Betelgeuze', ra: 5.919, dec: 7.41, mag: 0.5, color: '#ffb58a' },
      { id: 'bellatrix', name: 'Bellatrix', ra: 5.419, dec: 6.35, mag: 1.6 },
      { id: 'mintaka', name: 'Mintaka', ra: 5.533, dec: -0.30, mag: 2.2 },
      { id: 'alnilam', name: 'Alnilam', ra: 5.603, dec: -1.20, mag: 1.7 },
      { id: 'alnitak', name: 'Alnitak', ra: 5.679, dec: -1.94, mag: 1.8 },
      { id: 'saiph', name: 'Saiph', ra: 5.796, dec: -9.67, mag: 2.1 },
      { id: 'rigel', name: 'Rigel', ra: 5.242, dec: -8.20, mag: 0.1, color: '#bcd4ff' },
    ],
    edges: [['betelgeuze', 'bellatrix'], ['bellatrix', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'], ['alnitak', 'betelgeuze'], ['mintaka', 'rigel'], ['alnitak', 'saiph'], ['rigel', 'saiph']],
    order: ['mintaka', 'bellatrix', 'betelgeuze', 'alnitak', 'saiph', 'rigel', 'mintaka', 'alnilam', 'alnitak'],
    text: 'Souhvězdí lovce. Poznáš ho podle tří hvězd v řadě – Orionova pásu. U nás je vidět hlavně v zimě večer. Červenavá hvězda vlevo nahoře je Betelgeuze, modrobílá vpravo dole Rigel.',
    named: ['betelgeuze', 'rigel'],
  },
  {
    id: 'blizenci',
    name: 'Blíženci',
    stars: [
      { id: 'kastor', name: 'Kastor', ra: 7.577, dec: 31.89, mag: 1.6 },
      { id: 'pollux', name: 'Pollux', ra: 7.755, dec: 28.03, mag: 1.1, color: '#ffe2b8' },
      { id: 'mebsuta', name: 'Mebsuta', ra: 6.732, dec: 25.13, mag: 3.0 },
      { id: 'tejat', name: 'Tejat', ra: 6.383, dec: 22.51, mag: 2.9 },
      { id: 'wasat', name: 'Wasat', ra: 7.335, dec: 21.98, mag: 3.5 },
      { id: 'alhena', name: 'Alhena', ra: 6.629, dec: 16.40, mag: 1.9 },
    ],
    edges: [['kastor', 'pollux'], ['kastor', 'mebsuta'], ['mebsuta', 'tejat'], ['pollux', 'wasat'], ['wasat', 'alhena']],
    text: 'Dvě jasné hvězdy vedle sebe, Kastor a Pollux, jsou jako dvojčata. Nejlépe je uvidíme v zimě.',
    named: ['kastor', 'pollux'],
  },
];

export const POLARKA_TEXT = 'Dvě zadní hvězdy Velkého vozu ukazují k Polárce. Vzdálenost mezi nimi prodluž asi pětkrát. Polárka ukazuje k severu – podle ní se dá v noci najít směr.';

export function constellation(id: Constellation['id']) {
  return CONSTELLATIONS.find((c) => c.id === id)!;
}

/** Hvězdy, které jsou v jednom „výřezu oblohy“. Velký vůz se ukazuje i s Polárkou. */
export type SceneId = Constellation['id'] | 'all';

export function sceneStars(id: SceneId, withPolarka = id === 'vuz'): SkyStar[] {
  if (id === 'all') {
    // Celá obloha: všechny hvězdy všech souhvězdí, každá jen jednou (Polárka je ve Velkém i Malém voze).
    const seen = new Map<string, SkyStar>();
    for (const c of CONSTELLATIONS) for (const s of c.stars) seen.set(s.id, s);
    seen.set(POLARKA.id, POLARKA);
    return [...seen.values()];
  }
  const c = constellation(id);
  return id === 'vuz' && withPolarka ? [...c.stars, POLARKA] : c.stars;
}

/**
 * Celá obloha jako otočná mapa hvězd: střed je u Polárky (severní nebeský pól), čím dál od středu,
 * tím blíž k rovníku. Pohled vzhůru, takže východ je proti směru hodinových ručiček.
 */
export function projectSky(stars: SkyStar[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const s of stars) {
    const r = 90 - s.dec, th = (s.ra / 24) * Math.PI * 2;
    out[s.id] = { x: r * Math.cos(th), y: r * Math.sin(th) };
  }
  return out;
}

/**
 * Gnómonická projekce kolem středu výřezu: hvězdy se zobrazí jako na obloze při pohledu vzhůru
 * (východ vlevo, sever nahoře). Vrací souřadnice v libovolných jednotkách – obrazovka si je přizpůsobí.
 */
export function projectScene(stars: SkyStar[]): Record<string, { x: number; y: number }> {
  const rad = Math.PI / 180;
  const vec = (s: SkyStar) => {
    const a = s.ra * 15 * rad, d = s.dec * rad;
    return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  };
  const sum = stars.map(vec).reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]);
  const len = Math.hypot(sum[0], sum[1], sum[2]);
  const ra0 = Math.atan2(sum[1], sum[0]);
  const dec0 = Math.asin(sum[2] / len);
  const out: Record<string, { x: number; y: number }> = {};
  for (const s of stars) {
    const a = s.ra * 15 * rad, d = s.dec * rad;
    const cosc = Math.sin(dec0) * Math.sin(d) + Math.cos(dec0) * Math.cos(d) * Math.cos(a - ra0);
    const x = (Math.cos(d) * Math.sin(a - ra0)) / cosc;
    const y = (Math.cos(dec0) * Math.sin(d) - Math.sin(dec0) * Math.cos(d) * Math.cos(a - ra0)) / cosc;
    out[s.id] = { x: -x, y: -y };
  }
  return out;
}
