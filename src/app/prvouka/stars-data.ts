/**
 * Souhvězdí pro minihru Souhvězdí (3. ročník, vesmír).
 * Polohy hvězd jsou skutečné (rektascenze v hodinách, deklinace ve stupních, hvězdná velikost),
 * takže tvar i vzdálenosti na obrazovce odpovídají obloze. Hrany = čáry, které se kreslí.
 */

export interface SkyStar { id: string; name: string; ra: number; dec: number; mag: number; color?: string }
/** Kdy je souhvězdí u nás nejlépe vidět večer. „cely-rok“ = blízko Polárky, nikdy nezapadne. */
export type Season = 'cely-rok' | 'jaro' | 'leto' | 'podzim' | 'zima';
export const SEASONS: Array<{ id: Season; name: string; on: string; icon: string; text: string; ra: number }> = [
  { id: 'jaro', name: 'Jaro', on: 'na jaře', icon: '🌱', ra: 11.5, text: 'Na jaře večer vidíme vysoko na jihu Lva, Pannu se Spikou a Pastýře s oranžovým Arkturem. K Arkturu dovede oblouk oje Velkého vozu.' },
  { id: 'leto', name: 'Léto', on: 'v létě', icon: '☀️', ra: 18.5, text: 'V létě večer je vysoko nad hlavou Letní trojúhelník: Vega v Lyře, Deneb v Labuti a Altair v Orlu. Nízko nad jihem svítí červený Antares ve Štíru.' },
  { id: 'podzim', name: 'Podzim', on: 'na podzim', icon: '🍂', ra: 0.5, text: 'Na podzim večer je vysoko velký čtverec Pegase. Z jeho rohu vychází řada hvězd Andromedy a za ní je Perseus.' },
  { id: 'zima', name: 'Zima', on: 'v zimě', icon: '❄️', ra: 6, text: 'Zimní obloha je nejjasnější z celého roku: Orion, Býk s Aldebaranem a Plejádami, Blíženci, Vozka s Capellou a Sírius ve Velkém psu – nejjasnější hvězda noční oblohy.' },
  { id: 'cely-rok', name: 'Po celý rok', on: 'po celý rok', icon: '⭐', ra: 0, text: 'Tato souhvězdí jsou blízko Polárky. Celou noc kolem ní krouží a nikdy nezapadnou pod obzor, proto je u nás vidíme po celý rok.' },
];

export interface Constellation {
  id: string;
  name: string;
  season: Season;
  stars: SkyStar[];
  edges: Array<[string, string]>;
  /** Pořadí ve hře (spojovačka podle čísel). Hvězda může mít víc čísel. '-' = zvednout tužku (další číslo začíná novou čáru). */
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
    season: 'cely-rok',
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
    season: 'cely-rok',
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
    order: ['polarka', 'yildun', 'umi-eps', 'umi-zeta', 'kochab', 'pherkad', 'umi-eta', 'umi-zeta'],
    text: 'Menší vůz, jehož oj končí Polárkou. Většina jeho hvězd svítí slabě, takže ve městě ho často nevidíme celý. Na obloze je po celý rok.',
    named: ['polarka'],
  },
  {
    id: 'kasiopeja',
    season: 'cely-rok',
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
    season: 'leto',
    name: 'Labuť',
    stars: [
      { id: 'deneb', name: 'Deneb', ra: 20.690, dec: 45.28, mag: 1.3 },
      { id: 'sadr', name: 'Sadr', ra: 20.370, dec: 40.26, mag: 2.2 },
      { id: 'albireo', name: 'Albireo', ra: 19.512, dec: 27.96, mag: 3.1 },
      { id: 'gienah', name: 'Gienah', ra: 20.770, dec: 33.97, mag: 2.5 },
      { id: 'cyg-delta', name: 'δ', ra: 19.750, dec: 45.13, mag: 2.9 },
    ],
    edges: [['deneb', 'sadr'], ['sadr', 'albireo'], ['cyg-delta', 'sadr'], ['sadr', 'gienah']],
    order: ['deneb', 'sadr', 'albireo', '-', 'cyg-delta', 'sadr', 'gienah'],
    text: 'Velký kříž z hvězd, proto se mu říká i Severní kříž. Nejjasnější hvězda je Deneb. Nejlépe ho uvidíme v létě.',
    named: ['deneb'],
  },
  {
    id: 'lyra',
    season: 'leto',
    name: 'Lyra',
    stars: [
      { id: 'vega', name: 'Vega', ra: 18.616, dec: 38.78, mag: 0.0, color: '#dce9ff' },
      { id: 'lyr-zeta', name: 'ζ', ra: 18.746, dec: 37.61, mag: 4.3 },
      { id: 'lyr-delta', name: 'δ', ra: 18.908, dec: 36.90, mag: 4.3 },
      { id: 'sulafat', name: 'Sulafat', ra: 18.982, dec: 32.69, mag: 3.2 },
      { id: 'sheliak', name: 'Sheliak', ra: 18.835, dec: 33.36, mag: 3.5 },
    ],
    edges: [['vega', 'lyr-zeta'], ['lyr-zeta', 'lyr-delta'], ['lyr-delta', 'sulafat'], ['sulafat', 'sheliak'], ['sheliak', 'lyr-zeta']],
    order: ['vega', 'lyr-zeta', 'lyr-delta', 'sulafat', 'sheliak', 'lyr-zeta'],
    text: 'Malé souhvězdí, ale s jednou z nejjasnějších hvězd na obloze – Vegou. V létě večer svítí vysoko nad hlavou.',
    named: ['vega'],
  },
  {
    id: 'lev',
    season: 'jaro',
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
    order: ['leo-eps', 'leo-mu', 'leo-zeta', 'algieba', 'leo-eta', 'regulus', 'chertan', 'denebola', 'zosma', 'algieba', '-', 'chertan', 'zosma'],
    text: 'Jarní souhvězdí. Hlavu lva tvoří hvězdy ve tvaru obráceného otazníku, nejjasnější z nich je Regulus.',
    named: ['regulus'],
  },
  {
    id: 'orion',
    season: 'zima',
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
    season: 'zima',
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
    order: ['tejat', 'mebsuta', 'kastor', 'pollux', 'wasat', 'alhena'],
    text: 'Dvě jasné hvězdy vedle sebe, Kastor a Pollux, jsou jako dvojčata. Nejlépe je uvidíme v zimě.',
    named: ['kastor', 'pollux'],
  },
  // ——— Po celý rok (kolem Polárky) ———
  {
    id: 'drak', name: 'Drak', season: 'cely-rok',
    stars: [
      { id: 'giausar', name: 'λ', ra: 11.523, dec: 69.33, mag: 3.8 },
      { id: 'dra-kappa', name: 'κ', ra: 12.558, dec: 69.79, mag: 3.9 },
      { id: 'thuban', name: 'Thuban', ra: 14.073, dec: 64.38, mag: 3.7 },
      { id: 'edasich', name: 'Edasich', ra: 15.415, dec: 58.97, mag: 3.3 },
      { id: 'dra-theta', name: 'θ', ra: 16.031, dec: 58.57, mag: 4.0 },
      { id: 'dra-eta', name: 'η', ra: 16.400, dec: 61.51, mag: 2.7 },
      { id: 'dra-zeta', name: 'ζ', ra: 17.146, dec: 65.71, mag: 3.2 },
      { id: 'altais', name: 'Altais', ra: 19.209, dec: 67.66, mag: 3.1 },
      { id: 'grumium', name: 'Grumium', ra: 17.892, dec: 56.87, mag: 3.7 },
      { id: 'eltanin', name: 'Eltanin', ra: 17.943, dec: 51.49, mag: 2.2 },
      { id: 'rastaban', name: 'Rastaban', ra: 17.507, dec: 52.30, mag: 2.8 },
      { id: 'dra-nu', name: 'ν', ra: 17.537, dec: 55.18, mag: 4.9 },
    ],
    edges: [['giausar', 'dra-kappa'], ['dra-kappa', 'thuban'], ['thuban', 'edasich'], ['edasich', 'dra-theta'], ['dra-theta', 'dra-eta'], ['dra-eta', 'dra-zeta'], ['dra-zeta', 'altais'], ['altais', 'grumium'], ['grumium', 'eltanin'], ['eltanin', 'rastaban'], ['rastaban', 'dra-nu'], ['dra-nu', 'grumium']],
    order: ['giausar', 'dra-kappa', 'thuban', 'edasich', 'dra-theta', 'dra-eta', 'dra-zeta', 'altais', 'grumium', 'eltanin', 'rastaban', 'dra-nu', 'grumium'],
    text: 'Dlouhé souhvězdí, které se jako had vine mezi Velkým a Malým vozem. Hlavu mu tvoří čtyři hvězdy. Je blízko Polárky, a proto ho vidíme po celý rok.',
  },
  {
    id: 'cefeus', name: 'Cefeus', season: 'cely-rok',
    stars: [
      { id: 'alderamin', name: 'Alderamin', ra: 21.310, dec: 62.59, mag: 2.5 },
      { id: 'alfirk', name: 'Alfirk', ra: 21.478, dec: 70.56, mag: 3.2 },
      { id: 'errai', name: 'Errai', ra: 23.656, dec: 77.63, mag: 3.2 },
      { id: 'cep-iota', name: 'ι', ra: 22.828, dec: 66.20, mag: 3.5 },
      { id: 'cep-zeta', name: 'ζ', ra: 22.181, dec: 58.20, mag: 3.4 },
    ],
    edges: [['alderamin', 'alfirk'], ['alfirk', 'errai'], ['errai', 'cep-iota'], ['cep-iota', 'alfirk'], ['cep-iota', 'cep-zeta'], ['cep-zeta', 'alderamin']],
    order: ['alfirk', 'errai', 'cep-iota', 'alfirk', 'alderamin', 'cep-zeta', 'cep-iota'],
    text: 'Pět hvězd ve tvaru domečku se špičatou střechou. Leží vedle Kasiopeji blízko Polárky a na obloze je po celý rok.',
  },
  // ——— Jaro ———
  {
    id: 'pastyr', name: 'Pastýř', season: 'jaro',
    stars: [
      { id: 'arktur', name: 'Arktur', ra: 14.261, dec: 19.18, mag: 0.0, color: '#ffc890' },
      { id: 'izar', name: 'Izar', ra: 14.750, dec: 27.07, mag: 2.4 },
      { id: 'boo-delta', name: 'δ', ra: 15.258, dec: 33.31, mag: 3.5 },
      { id: 'nekkar', name: 'Nekkar', ra: 15.032, dec: 40.39, mag: 3.5 },
      { id: 'seginus', name: 'Seginus', ra: 14.535, dec: 38.31, mag: 3.0 },
      { id: 'boo-rho', name: 'ρ', ra: 14.531, dec: 30.37, mag: 3.6 },
      { id: 'muphrid', name: 'Muphrid', ra: 13.911, dec: 18.40, mag: 2.7 },
    ],
    edges: [['arktur', 'izar'], ['izar', 'boo-delta'], ['boo-delta', 'nekkar'], ['nekkar', 'seginus'], ['seginus', 'boo-rho'], ['boo-rho', 'arktur'], ['arktur', 'muphrid']],
    order: ['muphrid', 'arktur', 'izar', 'boo-delta', 'nekkar', 'seginus', 'boo-rho', 'arktur'],
    text: 'Hvězdy ve tvaru papírového draka nebo kornoutu. Na jeho špičce svítí oranžový Arktur, jedna z nejjasnějších hvězd. Najdeš ho, když prodloužíš oblouk oje Velkého vozu.',
    named: ['arktur'],
  },
  {
    id: 'koruna', name: 'Severní koruna', season: 'jaro',
    stars: [
      { id: 'crb-theta', name: 'θ', ra: 15.549, dec: 31.36, mag: 4.1 },
      { id: 'crb-beta', name: 'β', ra: 15.464, dec: 29.11, mag: 3.7 },
      { id: 'alphecca', name: 'Gemma', ra: 15.578, dec: 26.71, mag: 2.2 },
      { id: 'crb-gamma', name: 'γ', ra: 15.712, dec: 26.30, mag: 3.8 },
      { id: 'crb-delta', name: 'δ', ra: 15.827, dec: 26.07, mag: 4.6 },
      { id: 'crb-eps', name: 'ε', ra: 15.960, dec: 26.88, mag: 4.2 },
    ],
    edges: [['crb-theta', 'crb-beta'], ['crb-beta', 'alphecca'], ['alphecca', 'crb-gamma'], ['crb-gamma', 'crb-delta'], ['crb-delta', 'crb-eps']],
    order: ['crb-theta', 'crb-beta', 'alphecca', 'crb-gamma', 'crb-delta', 'crb-eps'],
    text: 'Malý oblouk hvězd jako koruna nebo podkova. Leží hned vedle Pastýře. Nejlépe ji uvidíme koncem jara a v létě.',
  },
  {
    id: 'panna', name: 'Panna', season: 'jaro',
    stars: [
      { id: 'spika', name: 'Spika', ra: 13.420, dec: -11.16, mag: 1.0, color: '#cfe0ff' },
      { id: 'porrima', name: 'Porrima', ra: 12.694, dec: -1.45, mag: 2.7 },
      { id: 'vir-delta', name: 'δ', ra: 12.927, dec: 3.40, mag: 3.4 },
      { id: 'vindemiatrix', name: 'Vindemiatrix', ra: 13.036, dec: 10.96, mag: 2.8 },
      { id: 'vir-zeta', name: 'ζ', ra: 13.578, dec: -0.60, mag: 3.4 },
      { id: 'zaniah', name: 'Zaniah', ra: 12.332, dec: -0.67, mag: 3.9 },
      { id: 'zavijava', name: 'Zavijava', ra: 11.845, dec: 1.76, mag: 3.6 },
    ],
    edges: [['zavijava', 'zaniah'], ['zaniah', 'porrima'], ['porrima', 'vir-delta'], ['vir-delta', 'vindemiatrix'], ['porrima', 'spika'], ['spika', 'vir-zeta'], ['vir-zeta', 'vir-delta']],
    order: ['zavijava', 'zaniah', 'porrima', 'spika', 'vir-zeta', 'vir-delta', 'vindemiatrix', '-', 'porrima', 'vir-delta'],
    text: 'Velké jarní souhvězdí. Nejjasnější hvězda je modrobílá Spika. Najdeš ji, když oblouk oje Velkého vozu prodloužíš přes Arktur ještě dál.',
    named: ['spika'],
  },
  // ——— Léto ———
  {
    id: 'orel', name: 'Orel', season: 'leto',
    stars: [
      { id: 'altair', name: 'Altair', ra: 19.846, dec: 8.87, mag: 0.8 },
      { id: 'tarazed', name: 'Tarazed', ra: 19.771, dec: 10.61, mag: 2.7 },
      { id: 'alshain', name: 'Alshain', ra: 19.922, dec: 6.41, mag: 3.7 },
      { id: 'aql-zeta', name: 'ζ', ra: 19.090, dec: 13.86, mag: 3.0 },
      { id: 'aql-delta', name: 'δ', ra: 19.425, dec: 3.11, mag: 3.4 },
      { id: 'aql-theta', name: 'θ', ra: 20.188, dec: -0.82, mag: 3.2 },
      { id: 'aql-lambda', name: 'λ', ra: 19.104, dec: -4.88, mag: 3.4 },
    ],
    edges: [['tarazed', 'altair'], ['altair', 'alshain'], ['alshain', 'aql-theta'], ['altair', 'aql-delta'], ['aql-delta', 'aql-lambda'], ['aql-delta', 'aql-zeta']],
    order: ['aql-theta', 'alshain', 'altair', 'tarazed', '-', 'altair', 'aql-delta', 'aql-zeta', '-', 'aql-delta', 'aql-lambda'],
    text: 'Letní souhvězdí s jasnou hvězdou Altair. Altair, Vega z Lyry a Deneb z Labutě tvoří na letní obloze velký Letní trojúhelník.',
    named: ['altair'],
  },
  {
    id: 'herkules', name: 'Herkules', season: 'leto',
    stars: [
      { id: 'her-zeta', name: 'ζ', ra: 16.688, dec: 31.60, mag: 2.8 },
      { id: 'her-eta', name: 'η', ra: 16.715, dec: 38.92, mag: 3.5 },
      { id: 'her-pi', name: 'π', ra: 17.251, dec: 36.81, mag: 3.2 },
      { id: 'her-eps', name: 'ε', ra: 17.005, dec: 30.93, mag: 3.9 },
      { id: 'kornephoros', name: 'Kornephoros', ra: 16.504, dec: 21.49, mag: 2.8 },
      { id: 'her-delta', name: 'δ', ra: 17.250, dec: 24.84, mag: 3.1 },
      { id: 'her-theta', name: 'θ', ra: 17.938, dec: 37.25, mag: 3.9 },
      { id: 'her-iota', name: 'ι', ra: 17.658, dec: 46.01, mag: 3.8 },
      { id: 'her-sigma', name: 'σ', ra: 16.568, dec: 42.44, mag: 4.2 },
    ],
    edges: [['her-zeta', 'her-eta'], ['her-eta', 'her-pi'], ['her-pi', 'her-eps'], ['her-eps', 'her-zeta'], ['her-zeta', 'kornephoros'], ['her-eps', 'her-delta'], ['her-pi', 'her-theta'], ['her-theta', 'her-iota'], ['her-eta', 'her-sigma']],
    order: ['kornephoros', 'her-zeta', 'her-eta', 'her-pi', 'her-eps', 'her-zeta', '-', 'her-eps', 'her-delta', '-', 'her-pi', 'her-theta', 'her-iota', '-', 'her-eta', 'her-sigma'],
    text: 'Souhvězdí hrdiny Herkula. Poznáš ho podle čtyř hvězd do lichoběžníku uprostřed. Svítí slabě, ale v létě je vysoko na obloze.',
  },
  {
    id: 'stir', name: 'Štír', season: 'leto',
    stars: [
      { id: 'acrab', name: 'Acrab', ra: 16.091, dec: -19.81, mag: 2.6 },
      { id: 'dschubba', name: 'Dschubba', ra: 16.006, dec: -22.62, mag: 2.3 },
      { id: 'sco-pi', name: 'π', ra: 15.981, dec: -26.11, mag: 2.9 },
      { id: 'sco-sigma', name: 'σ', ra: 16.353, dec: -25.59, mag: 2.9 },
      { id: 'antares', name: 'Antares', ra: 16.490, dec: -26.43, mag: 1.0, color: '#ff9c7a' },
      { id: 'sco-tau', name: 'τ', ra: 16.598, dec: -28.22, mag: 2.8 },
      { id: 'sco-eps', name: 'ε', ra: 16.836, dec: -34.29, mag: 2.3 },
      { id: 'sco-mu', name: 'μ', ra: 16.864, dec: -38.05, mag: 3.0 },
      { id: 'sco-zeta', name: 'ζ', ra: 16.910, dec: -42.36, mag: 3.6 },
      { id: 'sco-eta', name: 'η', ra: 17.203, dec: -43.24, mag: 3.3 },
      { id: 'sargas', name: 'Sargas', ra: 17.622, dec: -43.00, mag: 1.9 },
      { id: 'sco-iota', name: 'ι', ra: 17.793, dec: -40.13, mag: 3.0 },
      { id: 'sco-kappa', name: 'κ', ra: 17.708, dec: -39.03, mag: 2.4 },
      { id: 'shaula', name: 'Shaula', ra: 17.560, dec: -37.10, mag: 1.6 },
      { id: 'lesath', name: 'Lesath', ra: 17.513, dec: -37.30, mag: 2.7 },
    ],
    edges: [['acrab', 'dschubba'], ['dschubba', 'sco-pi'], ['dschubba', 'sco-sigma'], ['sco-sigma', 'antares'], ['antares', 'sco-tau'], ['sco-tau', 'sco-eps'], ['sco-eps', 'sco-mu'], ['sco-mu', 'sco-zeta'], ['sco-zeta', 'sco-eta'], ['sco-eta', 'sargas'], ['sargas', 'sco-iota'], ['sco-iota', 'sco-kappa'], ['sco-kappa', 'shaula'], ['shaula', 'lesath']],
    order: ['acrab', 'dschubba', 'sco-sigma', 'antares', 'sco-tau', 'sco-eps', 'sco-mu', 'sco-zeta', 'sco-eta', 'sargas', 'sco-iota', 'sco-kappa', 'shaula', 'lesath', '-', 'dschubba', 'sco-pi'],
    text: 'Hvězdy ve tvaru háčku se zakrouceným ocasem. Uprostřed svítí červený Antares. U nás je v létě jen nízko nad jižním obzorem, takže konec ocasu často schová obzor.',
    named: ['antares'],
  },
  {
    id: 'strelec', name: 'Střelec', season: 'leto',
    stars: [
      { id: 'alnasl', name: 'Alnasl', ra: 18.097, dec: -30.42, mag: 3.0 },
      { id: 'kaus-media', name: 'Kaus Media', ra: 18.350, dec: -29.83, mag: 2.7 },
      { id: 'kaus-australis', name: 'Kaus Australis', ra: 18.403, dec: -34.38, mag: 1.8 },
      { id: 'kaus-borealis', name: 'Kaus Borealis', ra: 18.466, dec: -25.42, mag: 2.8 },
      { id: 'sgr-phi', name: 'φ', ra: 18.761, dec: -26.99, mag: 3.2 },
      { id: 'nunki', name: 'Nunki', ra: 18.921, dec: -26.30, mag: 2.0 },
      { id: 'sgr-tau', name: 'τ', ra: 19.116, dec: -27.67, mag: 3.3 },
      { id: 'ascella', name: 'Ascella', ra: 19.044, dec: -29.88, mag: 2.6 },
    ],
    edges: [['alnasl', 'kaus-media'], ['alnasl', 'kaus-australis'], ['kaus-media', 'kaus-australis'], ['kaus-media', 'kaus-borealis'], ['kaus-borealis', 'sgr-phi'], ['kaus-media', 'sgr-phi'], ['sgr-phi', 'nunki'], ['nunki', 'sgr-tau'], ['sgr-tau', 'ascella'], ['ascella', 'sgr-phi'], ['ascella', 'kaus-australis']],
    order: ['kaus-australis', 'alnasl', 'kaus-media', 'kaus-australis', 'ascella', 'sgr-phi', 'kaus-media', 'kaus-borealis', 'sgr-phi', 'nunki', 'sgr-tau', 'ascella'],
    text: 'Jeho nejjasnější hvězdy vypadají jako čajová konvice. Nad ní je nejhustší a nejjasnější část Mléčné dráhy. U nás je v létě nízko nad jihem.',
  },
  // ——— Podzim ———
  {
    id: 'pegas', name: 'Pegas', season: 'podzim',
    stars: [
      { id: 'markab', name: 'Markab', ra: 23.079, dec: 15.21, mag: 2.5 },
      { id: 'scheat', name: 'Scheat', ra: 23.063, dec: 28.08, mag: 2.4 },
      { id: 'alpheratz', name: 'Alpheratz', ra: 0.140, dec: 29.09, mag: 2.1 },
      { id: 'algenib', name: 'Algenib', ra: 0.221, dec: 15.18, mag: 2.8 },
      { id: 'homam', name: 'Homam', ra: 22.691, dec: 10.83, mag: 3.4 },
      { id: 'biham', name: 'Biham', ra: 22.170, dec: 6.20, mag: 3.5 },
      { id: 'enif', name: 'Enif', ra: 21.736, dec: 9.88, mag: 2.4 },
      { id: 'matar', name: 'Matar', ra: 22.717, dec: 30.22, mag: 2.9 },
    ],
    edges: [['markab', 'scheat'], ['scheat', 'alpheratz'], ['alpheratz', 'algenib'], ['algenib', 'markab'], ['markab', 'homam'], ['homam', 'biham'], ['biham', 'enif'], ['scheat', 'matar']],
    order: ['enif', 'biham', 'homam', 'markab', 'scheat', 'matar', '-', 'markab', 'algenib', 'alpheratz', 'scheat'],
    text: 'Okřídlený kůň. Poznáš ho podle velkého čtverce ze čtyř hvězd, kterému se říká Podzimní čtverec. Jeho levá horní hvězda už patří Andromedě.',
  },
  {
    id: 'andromeda', name: 'Andromeda', season: 'podzim',
    stars: [
      { id: 'alpheratz', name: 'Alpheratz', ra: 0.140, dec: 29.09, mag: 2.1 },
      { id: 'and-delta', name: 'δ', ra: 0.656, dec: 30.86, mag: 3.3 },
      { id: 'mirach', name: 'Mirach', ra: 1.162, dec: 35.62, mag: 2.1 },
      { id: 'almach', name: 'Almach', ra: 2.065, dec: 42.33, mag: 2.1 },
      { id: 'and-mu', name: 'μ', ra: 0.946, dec: 38.50, mag: 3.9 },
      { id: 'and-nu', name: 'ν', ra: 0.830, dec: 41.08, mag: 4.5 },
    ],
    edges: [['alpheratz', 'and-delta'], ['and-delta', 'mirach'], ['mirach', 'almach'], ['mirach', 'and-mu'], ['and-mu', 'and-nu']],
    order: ['alpheratz', 'and-delta', 'mirach', 'almach', '-', 'mirach', 'and-mu', 'and-nu'],
    text: 'Řada hvězd, která vychází z rohu Pegasova čtverce. Kousek vedle je slabý obláček – galaxie v Andromedě. Je to nejvzdálenější věc, kterou uvidíme pouhým okem.',
  },
  {
    id: 'perseus', name: 'Perseus', season: 'podzim',
    stars: [
      { id: 'per-eta', name: 'η', ra: 2.845, dec: 55.90, mag: 3.8 },
      { id: 'per-gamma', name: 'γ', ra: 3.080, dec: 53.51, mag: 2.9 },
      { id: 'mirfak', name: 'Mirfak', ra: 3.405, dec: 49.86, mag: 1.8 },
      { id: 'per-delta', name: 'δ', ra: 3.715, dec: 47.79, mag: 3.0 },
      { id: 'per-eps', name: 'ε', ra: 3.964, dec: 40.01, mag: 2.9 },
      { id: 'per-zeta', name: 'ζ', ra: 3.902, dec: 31.88, mag: 2.9 },
      { id: 'algol', name: 'Algol', ra: 3.136, dec: 40.96, mag: 2.1 },
    ],
    edges: [['per-eta', 'per-gamma'], ['per-gamma', 'mirfak'], ['mirfak', 'per-delta'], ['per-delta', 'per-eps'], ['per-eps', 'per-zeta'], ['mirfak', 'algol']],
    order: ['per-eta', 'per-gamma', 'mirfak', 'per-delta', 'per-eps', 'per-zeta', '-', 'mirfak', 'algol'],
    text: 'Souhvězdí hrdiny Persea. Je v něm zvláštní hvězda Algol, která každé necelé tři dny na pár hodin zeslábne. Vidíme ho na podzim a v zimě.',
    named: ['algol'],
  },
  {
    id: 'beran', name: 'Beran', season: 'podzim',
    stars: [
      { id: 'ari-41', name: '41', ra: 2.833, dec: 27.26, mag: 3.6 },
      { id: 'hamal', name: 'Hamal', ra: 2.120, dec: 23.46, mag: 2.0 },
      { id: 'sheratan', name: 'Sheratan', ra: 1.911, dec: 20.81, mag: 2.6 },
      { id: 'mesarthim', name: 'Mesarthim', ra: 1.892, dec: 19.29, mag: 3.9 },
    ],
    edges: [['ari-41', 'hamal'], ['hamal', 'sheratan'], ['sheratan', 'mesarthim']],
    order: ['ari-41', 'hamal', 'sheratan', 'mesarthim'],
    text: 'Malé podzimní souhvězdí – jen pár hvězd v krátké lomené čáře. Nejjasnější z nich je Hamal.',
    named: ['hamal'],
  },
  // ——— Zima ———
  {
    id: 'byk', name: 'Býk', season: 'zima',
    stars: [
      { id: 'aldebaran', name: 'Aldebaran', ra: 4.599, dec: 16.51, mag: 0.9, color: '#ffc89a' },
      { id: 'elnath', name: 'Elnath', ra: 5.438, dec: 28.61, mag: 1.7 },
      { id: 'tau-zeta', name: 'ζ', ra: 5.627, dec: 21.14, mag: 3.0 },
      { id: 'tau-theta', name: 'θ', ra: 4.478, dec: 15.87, mag: 3.4 },
      { id: 'tau-gamma', name: 'γ', ra: 4.330, dec: 15.63, mag: 3.7 },
      { id: 'tau-delta', name: 'δ', ra: 4.382, dec: 17.54, mag: 3.8 },
      { id: 'tau-eps', name: 'ε', ra: 4.477, dec: 19.18, mag: 3.5 },
      { id: 'tau-lambda', name: 'λ', ra: 4.011, dec: 12.49, mag: 3.4 },
      { id: 'plejady', name: 'Plejády', ra: 3.791, dec: 24.11, mag: 2.9, color: '#cfe0ff' },
    ],
    edges: [['tau-lambda', 'tau-gamma'], ['tau-gamma', 'tau-delta'], ['tau-delta', 'tau-eps'], ['tau-eps', 'elnath'], ['tau-gamma', 'tau-theta'], ['tau-theta', 'aldebaran'], ['aldebaran', 'tau-zeta']],
    order: ['elnath', 'tau-eps', 'tau-delta', 'tau-gamma', 'tau-theta', 'aldebaran', 'tau-zeta', '-', 'tau-gamma', 'tau-lambda'],
    text: 'Hlavu býka tvoří hvězdy do písmene V. Oranžový Aldebaran je jeho oko. Kousek vedle svítí hvězdokupa Plejády, které se lidově říká Kuřátka.',
    named: ['aldebaran', 'plejady'],
  },
  {
    id: 'vozka', name: 'Vozka', season: 'zima',
    stars: [
      { id: 'capella', name: 'Capella', ra: 5.278, dec: 46.00, mag: 0.1, color: '#fff1c4' },
      { id: 'menkalinan', name: 'Menkalinan', ra: 5.992, dec: 44.95, mag: 1.9 },
      { id: 'aur-theta', name: 'θ', ra: 5.995, dec: 37.21, mag: 2.6 },
      { id: 'elnath', name: 'Elnath', ra: 5.438, dec: 28.61, mag: 1.7 },
      { id: 'hassaleh', name: 'Hassaleh', ra: 4.950, dec: 33.17, mag: 2.7 },
    ],
    edges: [['capella', 'menkalinan'], ['menkalinan', 'aur-theta'], ['aur-theta', 'elnath'], ['elnath', 'hassaleh'], ['hassaleh', 'capella']],
    order: ['capella', 'menkalinan', 'aur-theta', 'elnath', 'hassaleh', 'capella'],
    text: 'Pět hvězd do pětiúhelníku. Svítí v něm žlutá Capella, jedna z nejjasnějších hvězd zimní oblohy. Spodní hvězdu pětiúhelníku si Vozka půjčuje od Býka.',
    named: ['capella'],
  },
  {
    id: 'velky-pes', name: 'Velký pes', season: 'zima',
    stars: [
      { id: 'sirius', name: 'Sírius', ra: 6.752, dec: -16.72, mag: -1.5, color: '#e4eeff' },
      { id: 'mirzam', name: 'Mirzam', ra: 6.378, dec: -17.96, mag: 2.0 },
      { id: 'muliphein', name: 'Muliphein', ra: 7.063, dec: -15.63, mag: 4.1 },
      { id: 'wezen', name: 'Wezen', ra: 7.140, dec: -26.39, mag: 1.8 },
      { id: 'adhara', name: 'Adhara', ra: 6.977, dec: -28.97, mag: 1.5 },
      { id: 'aludra', name: 'Aludra', ra: 7.402, dec: -29.30, mag: 2.4 },
      { id: 'furud', name: 'Furud', ra: 6.339, dec: -30.06, mag: 3.0 },
    ],
    edges: [['mirzam', 'sirius'], ['sirius', 'muliphein'], ['sirius', 'wezen'], ['wezen', 'adhara'], ['adhara', 'furud'], ['wezen', 'aludra']],
    order: ['mirzam', 'sirius', 'wezen', 'adhara', 'furud', '-', 'sirius', 'muliphein', '-', 'wezen', 'aludra'],
    text: 'Svítí v něm Sírius – nejjasnější hvězda noční oblohy. Najdeš ho, když prodloužíš Orionův pás doleva dolů.',
    named: ['sirius'],
  },
  {
    id: 'maly-pes', name: 'Malý pes', season: 'zima',
    stars: [
      { id: 'prokyon', name: 'Prokyon', ra: 7.655, dec: 5.22, mag: 0.4, color: '#fff6e0' },
      { id: 'gomeisa', name: 'Gomeisa', ra: 7.453, dec: 8.29, mag: 2.9 },
    ],
    edges: [['prokyon', 'gomeisa']],
    order: ['gomeisa', 'prokyon'],
    text: 'Jen dvě hvězdy, ale jedna z nich, Prokyon, patří k nejjasnějším. Prokyon, Sírius a Betelgeuze tvoří velký Zimní trojúhelník.',
    named: ['prokyon'],
  },
];

export const POLARKA_TEXT = 'Dvě zadní hvězdy Velkého vozu ukazují k Polárce. Vzdálenost mezi nimi prodluž asi pětkrát. Polárka ukazuje k severu – podle ní se dá v noci najít směr.';

export function constellation(id: string) {
  return CONSTELLATIONS.find((c) => c.id === id)!;
}

/** Hvězdy, které jsou v jednom „výřezu oblohy“. Velký vůz se ukazuje i s Polárkou. */
export type SceneId = string; // id souhvězdí nebo 'all'

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
