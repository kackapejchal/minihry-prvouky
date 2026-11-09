import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { rng, SPACE_PLANETS, type PlanetKey, type SpacePlanet } from './space-engine';

/**
 * 3D model Sluneční soustavy (three.js). Slunce svítí bodovým světlem, planety mají
 * procedurální povrch na kouli, Saturn a Uran prstence, Země Měsíc a mraky.
 * Oběžné doby jsou ve skutečném poměru, vzdálenosti a velikosti zmenšené tak,
 * aby byla vidět celá soustava; režim „Skutečné velikosti“ seřadí planety vedle
 * Slunce ve skutečném poměru. Klepnutí na těleso k němu přiblíží kameru a drží ho v záběru.
 */


/**
 * Kolik let v modelu uběhne za 1 vteřinu podle posuvníku (0–1). Stupnice je logaritmická:
 * vlevo ½ dne za vteřinu (Měsíc jde sledovat), uprostřed (výchozí 0,4) asi 9 dní,
 * vpravo 2 roky za vteřinu (aby se pohnuly i vzdálené planety).
 */
export function yearsPerSecond(speed: number) {
  return (0.5 * Math.pow(1461, Math.max(0, Math.min(1, speed)))) / 365.25;
}

/** Barva dráhy podle planety, ať je na první pohled vidět, která dráha patří ke které planetě. */
const ORBIT_COLORS: Record<PlanetKey, number> = {
  merkur: 0x9a958d,
  venuse: 0xe9c98a,
  zeme: 0x4f9cff,
  mars: 0xe2663a,
  jupiter: 0xd9a066,
  saturn: 0xf0d79a,
  uran: 0x8fe3e0,
  neptun: 0x5b7cff,
};

/** Zářící stopa za planetou: šířka v px, délka oblouku (radiány) a počet bodů. */
const TRAIL_WIDTH = 2.5;
/** Barva nebe, do které stopa přechází. */
const SKY = new THREE.Color(0x05081a);
const TRAIL_ARC = 1.7;
const TRAIL_STEPS = 90;

export type SolarBodyId = PlanetKey | 'slunce' | 'mesic' | 'kometa';

export type SolarStyle = 'realny' | 'kresleny';

export interface SolarSceneOptions {
  view: 'orbit' | 'size';
  /** Opravdový vzhled (fotografické textury NASA) nebo kreslený (ploché barvy s obrysem). */
  style: SolarStyle;
  labels: boolean;
  still: boolean;
  onSelect: (id: SolarBodyId) => void;
  onYears?: (years: number) => void;
  /** Změnil se vzhled planet (přepnutí stylu nebo dočtená textura) – panel si obnoví obrázky. */
  onLook?: () => void;
  /** Režim Den a noc: co je právě u nás (u značky na Zemi). */
  onDayPart?: (part: DayPart) => void;
  /** Závod planet: kolikrát už která planeta oběhla Slunce od startu. */
  onRace?: (laps: Record<PlanetKey, number>) => void;
}

export type DayPart = 'den' | 'noc' | 'rano' | 'vecer';

/** Den a noc: 1 sekunda = 3 hodiny, jedna otočka Země trvá 8 sekund. */
const DAY_NIGHT_YEARS_PER_SECOND = 3 / 24 / 365.25;
/** Značka „Tady jsme my“: střed Evropy (50° s. š., 15° v. d.). */
const HOME_LAT = THREE.MathUtils.degToRad(50);
const HOME_LON = THREE.MathUtils.degToRad(15);

const SUN_R = 6;
const TILT: Partial<Record<PlanetKey, number>> = { zeme: 23.4, mars: 25, saturn: 26.7, uran: 97.8, neptun: 28, jupiter: 3 };
const AU_POW = 0.4;
const orbitRadius = (au: number) => {
  const min = Math.pow(0.39, AU_POW);
  const max = Math.pow(30.05, AU_POW);
  return 13 + (87 * (Math.pow(au, AU_POW) - min)) / (max - min);
};
const overviewRadius = (re: number) => 0.55 + 0.95 * Math.sqrt(re);

/* ------------------------------------------------------------ textury */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

/** Skvrna, která se na švu textury (x = 0 / x = W) neutrhne. */
function wrapBlob(ctx: CanvasRenderingContext2D, rnd: () => number, W: number, x: number, y: number, rx: number, ry: number) {
  for (const dx of [-W, 0, W]) {
    ctx.beginPath();
    const pts = 12;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const k = 0.65 + rnd() * 0.6;
      const px = x + dx + Math.cos(a) * rx * k;
      const py = y + Math.sin(a) * ry * k;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function bandsTexture(ctx: CanvasRenderingContext2D, W: number, H: number, rnd: () => number, colors: string[], wave: number) {
  let y = 0;
  let i = 0;
  while (y < H) {
    const h = H * (0.03 + rnd() * 0.07);
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.moveTo(0, y);
    const phase = rnd() * 6;
    for (let x = 0; x <= W; x += W / 64) ctx.lineTo(x, y + Math.sin((x / W) * Math.PI * 2 * 3 + phase) * H * wave);
    ctx.lineTo(W, y + h + 2);
    for (let x = W; x >= 0; x -= W / 64) ctx.lineTo(x, y + h + 2 + Math.sin((x / W) * Math.PI * 2 * 4 + phase) * H * wave);
    ctx.closePath();
    ctx.fill();
    y += h;
    i++;
  }
}

function planetMap(id: PlanetKey | 'slunce' | 'mesic'): HTMLCanvasElement {
  const W = 1024, H = 512;
  const { c, ctx } = canvas(W, H);
  const rnd = rng(id.length * 131 + 7);
  const fill = (col: string | CanvasGradient) => { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); };
  const craters = (n: number, dark: string, light: string) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = H * (0.1 + rnd() * 0.8), r = 3 + rnd() * 16;
      ctx.strokeStyle = dark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.3, r * 0.7, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    }
  };
  switch (id) {
    case 'slunce': {
      fill('#ffb43a');
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,240,150,.35)' : 'rgba(230,110,20,.3)';
        ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 2 + rnd() * 9, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'mesic': {
      fill('#bdb9b0');
      ctx.fillStyle = 'rgba(115,112,106,.6)';
      for (let i = 0; i < 9; i++) wrapBlob(ctx, rnd, W, rnd() * W, H * (0.3 + rnd() * 0.4), 40 + rnd() * 90, 30 + rnd() * 50);
      craters(160, 'rgba(80,78,74,.35)', 'rgba(255,255,255,.12)');
      break;
    }
    case 'merkur': {
      fill('#9b9792');
      for (let i = 0; i < 80; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(70,66,62,.3)' : 'rgba(205,200,195,.25)'; wrapBlob(ctx, rnd, W, rnd() * W, rnd() * H, 20 + rnd() * 60, 12 + rnd() * 30); }
      craters(220, 'rgba(55,52,48,.45)', 'rgba(230,226,220,.18)');
      break;
    }
    case 'venuse': {
      fill('#e6c98f');
      bandsTexture(ctx, W, H, rnd, ['#f1dcae', '#e2c287', '#efd6a2', '#d9b77a', '#ecd09a'], 0.03);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(255,245,220,.16)'; wrapBlob(ctx, rnd, W, rnd() * W, rnd() * H, 60 + rnd() * 120, 14 + rnd() * 24); }
      break;
    }
    case 'zeme': {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2c64b8'); g.addColorStop(0.5, '#1d58b0'); g.addColorStop(1, '#2c64b8'); fill(g);
      const land: Array<[number, number, number, number, string]> = [
        [0.2, 0.33, 0.11, 0.13, '#4b8a3e'], [0.27, 0.62, 0.06, 0.16, '#5a8d3f'], [0.52, 0.3, 0.07, 0.09, '#5f8f45'],
        [0.55, 0.55, 0.07, 0.16, '#b39a5f'], [0.7, 0.32, 0.16, 0.12, '#6c8a46'], [0.83, 0.68, 0.06, 0.06, '#b49a5d'], [0.75, 0.48, 0.05, 0.06, '#4d8a3d'],
      ];
      for (const [x, y, rx, ry, col] of land) {
        ctx.fillStyle = col; wrapBlob(ctx, rnd, W, x * W, y * H, rx * W, ry * H);
        ctx.fillStyle = 'rgba(60,110,50,.5)'; wrapBlob(ctx, rnd, W, x * W + rx * W * 0.2, y * H, rx * W * 0.5, ry * H * 0.5);
      }
      ctx.fillStyle = '#f2f6fb'; ctx.fillRect(0, 0, W, H * 0.06); ctx.fillRect(0, H * 0.93, W, H * 0.07);
      break;
    }
    case 'mars': {
      fill('#bf5a2e');
      for (let i = 0; i < 70; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(110,40,20,.32)' : 'rgba(230,145,95,.22)'; wrapBlob(ctx, rnd, W, rnd() * W, rnd() * H, 30 + rnd() * 90, 18 + rnd() * 40); }
      ctx.fillStyle = 'rgba(90,30,20,.35)'; ctx.fillRect(W * 0.2, H * 0.5, W * 0.4, H * 0.025);
      ctx.fillStyle = '#f7f1ea'; ctx.fillRect(0, 0, W, H * 0.05); ctx.fillRect(0, H * 0.96, W, H * 0.04);
      break;
    }
    case 'jupiter': {
      bandsTexture(ctx, W, H, rnd, ['#e9dcc4', '#c49a6c', '#f2e8d6', '#a8744c', '#e3cfae', '#b98a5e', '#efe2c9', '#cfa77c'], 0.008);
      ctx.fillStyle = '#c4573a'; ctx.beginPath(); ctx.ellipse(W * 0.62, H * 0.64, W * 0.045, H * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,200,.45)'; ctx.beginPath(); ctx.ellipse(W * 0.62, H * 0.64, W * 0.025, H * 0.026, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'saturn': {
      bandsTexture(ctx, W, H, rnd, ['#eadbb0', '#d8c08a', '#f0e3bf', '#cdb07a', '#e6d3a2'], 0.004);
      break;
    }
    case 'uran': {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#b6eef0'); g.addColorStop(1, '#8ad0d8'); fill(g);
      bandsTexture(ctx, W, H, rnd, ['rgba(255,255,255,.05)', 'rgba(0,80,100,.05)'], 0.002);
      break;
    }
    case 'neptun': {
      bandsTexture(ctx, W, H, rnd, ['#3d62d4', '#3557c6', '#4a6fe0', '#2f4fba'], 0.006);
      ctx.fillStyle = '#1e3488'; ctx.beginPath(); ctx.ellipse(W * 0.4, H * 0.42, W * 0.04, H * 0.04, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(rnd() * W, H * (0.25 + rnd() * 0.5), 20 + rnd() * 50, 4, 0, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
  }
  return c;
}

function cloudsMap(): HTMLCanvasElement {
  const W = 1024, H = 512;
  const { c, ctx } = canvas(W, H);
  const rnd = rng(99);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.3})`;
    wrapBlob(ctx, rnd, W, rnd() * W, H * (0.12 + rnd() * 0.76), 30 + rnd() * 90, 5 + rnd() * 12);
  }
  return c;
}

function ringMap(kind: 'saturn' | 'uran'): HTMLCanvasElement {
  const { c, ctx } = canvas(512, 4);
  if (kind === 'saturn') {
    const bands: Array<[number, number, string]> = [[0, 0.16, 'rgba(180,160,120,.35)'], [0.16, 0.6, 'rgba(226,206,160,.92)'], [0.6, 0.66, 'rgba(40,30,20,.1)'], [0.66, 1, 'rgba(205,185,140,.75)']];
    for (const [a, b, col] of bands) { ctx.fillStyle = col; ctx.fillRect(a * 512, 0, (b - a) * 512, 4); }
    for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(80,60,40,.12)'; ctx.fillRect(Math.random() * 512, 0, 1, 4); }
  } else {
    ctx.fillStyle = 'rgba(200,240,245,.4)'; ctx.fillRect(300, 0, 10, 4); ctx.fillRect(420, 0, 6, 4);
  }
  return c;
}

function glowTexture(inner: string, outer: string): THREE.Texture {
  const { c, ctx } = canvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, inner); g.addColorStop(0.25, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Fotografické textury (Solar System Scope, CC BY 4.0, podle dat NASA) – viz `public/prvouka/tretak/textury/CREDITS.md`. */
const TEXTURES = `${import.meta.env.BASE_URL}prvouka/tretak/textury/`;

/** Tři stupně stínování pro kreslený styl. */
function toonGradient(): THREE.Texture {
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

const tex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/* ------------------------------------------------------------ scéna */

interface PlanetNode {
  p: SpacePlanet;
  /** Skupina na oběžné dráze (pozice). */
  holder: THREE.Group;
  /** Nakloněná osa – mesh se točí kolem vlastní osy. */
  axis: THREE.Group;
  mesh: THREE.Mesh;
  orbit: THREE.LineLoop;
  /** Zářící stopa za planetou (otáčí se s planetou). */
  trail: Line2;
  baseR: number;
  label: HTMLDivElement;
}

export class SolarScene3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private planets: PlanetNode[] = [];
  private sun: THREE.Mesh;
  private sunGlow: THREE.Sprite;
  private moon: THREE.Mesh;
  private moonPivot = new THREE.Group();
  private comet: THREE.Group;
  private cometTail: THREE.Mesh;
  private belt: THREE.Points;
  private labelLayer: HTMLDivElement;
  private labels = new Map<string, HTMLDivElement>();
  private raycaster = new THREE.Raycaster();
  private resizeObserver: ResizeObserver;
  private raf = 0;
  private last = performance.now();
  private years = 0;
  private playing: boolean;
  private speed = 0.4;
  private view: 'orbit' | 'size';
  private showLabels: boolean;
  private selected: SolarBodyId = 'zeme';
  private focus: SolarBodyId | null = null;
  /** Přelet kamery: odkud a kam, průběh 0–1. */
  private flight: { fromPos: THREE.Vector3; fromTarget: THREE.Vector3; t: number; overview: boolean } | null = null;
  private lastFocusPos = new THREE.Vector3();
  private down: { x: number; y: number } | null = null;
  private style: SolarStyle;
  /** Tělesa se dvěma vzhledy: kreslený materiál je hned, opravdový se načte až při prvním přepnutí. */
  private skins: Array<{ mesh: THREE.Mesh; cartoon: THREE.Material; file: string; make: (t: THREE.Texture) => THREE.Material; real?: THREE.Material }> = [];
  private outlines: THREE.Object3D[] = [];
  private loader = new THREE.TextureLoader();
  private toon = toonGradient();
  private outlineMat = new THREE.MeshBasicMaterial({ color: 0x1b1530, side: THREE.BackSide });
  /** Den a noc: Země se točí podle času (1 otočka = 1 den) a má značku „Tady jsme my“. */
  private dayNight = false;
  private ambient = new THREE.AmbientLight(0xffffff, 0.12);
  private home = new THREE.Group();
  private homeLabel!: HTMLDivElement;
  private sunHint!: HTMLDivElement;
  private dayPart: DayPart | null = null;
  private lastSunDot = 0;
  /** Závod planet: posun na dráze, aby všechny vyrazily ze startovní čáry; zůstává i po závodě (nic neposkočí). */
  private phaseShift = new Map<string, number>();
  private raceStart: number | null = null;
  private raceLaps = '';
  private startLine!: THREE.Line;
  private startLabel!: HTMLDivElement;

  constructor(private container: HTMLElement, private opts: SolarSceneOptions) {
    this.view = opts.view;
    this.style = opts.style;
    this.showLabels = opts.labels;
    this.playing = !opts.still;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    Object.assign(this.renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' });

    this.labelLayer = document.createElement('div');
    Object.assign(this.labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
    container.appendChild(this.labelLayer);

    this.scene.background = new THREE.Color('#04060f');
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 5000);
    this.camera.position.set(0, 95, 175);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 600;
    this.controls.addEventListener('start', () => { this.flight = null; });

    this.scene.add(this.ambient);
    const light = new THREE.PointLight(0xfff2dd, 3.2, 0, 0);
    this.scene.add(light);

    this.addStars();
    {
      // Startovní čára pro Závod planet: od Slunce ven za Neptun, přerušovaná.
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(SUN_R + 1, 0, 0), new THREE.Vector3(orbitRadius(30.05) + 6, 0, 0)]);
      this.startLine = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 2, gapSize: 1.5, transparent: true, opacity: 0.75 }));
      this.startLine.computeLineDistances();
      this.startLine.visible = false;
      this.scene.add(this.startLine);
    }

    const sunMat = new THREE.MeshBasicMaterial({ map: tex(planetMap('slunce')) });
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 64, 32), sunMat);
    this.skin(this.sun, sunMat, 'slunce.jpg', (t) => new THREE.MeshBasicMaterial({ map: t }));
    this.sun.userData.id = 'slunce';
    this.scene.add(this.sun);
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,200,90,0.9)', 'rgba(255,120,20,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.sunGlow.scale.setScalar(SUN_R * 5);
    this.scene.add(this.sunGlow);
    this.addLabel('slunce', 'Slunce');

    for (const p of SPACE_PLANETS) this.addPlanet(p);

    // Měsíc kolem Země
    const earth = this.planets.find((n) => n.p.id === 'zeme')!;
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16), this.cartoonMaterial(planetMap('mesic')));
    this.skin(this.moon, this.moon.material as THREE.Material, 'mesic.jpg', (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
    this.addOutline(this.moon);
    this.moon.userData.id = 'mesic';
    this.moon.position.set(earth.baseR * 2.2 + 1.2, 0, 0);
    this.moonPivot.add(this.moon);
    earth.holder.add(this.moonPivot);
    this.addLabel('mesic', 'Měsíc');

    // Pás planetek mezi Marsem a Jupiterem
    const beltGeo = new THREE.BufferGeometry();
    const pts: number[] = [];
    const r = rng(5);
    for (let i = 0; i < 1800; i++) {
      const a = r() * Math.PI * 2;
      const d = orbitRadius(2.2) + r() * (orbitRadius(3.3) - orbitRadius(2.2));
      pts.push(Math.cos(a) * d, (r() - 0.5) * 1.2, Math.sin(a) * d);
    }
    beltGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.belt = new THREE.Points(beltGeo, new THREE.PointsMaterial({ color: 0xb8ad98, size: 0.14, sizeAttenuation: true }));
    this.scene.add(this.belt);
    this.addLabel('pas', 'pás planetek');

    // Kometa s ohonem, který míří od Slunce
    this.comet = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 8), new THREE.MeshBasicMaterial({ color: 0xeaf6ff }));
    head.userData.id = 'kometa';
    this.comet.add(head);
    const tailGeo = new THREE.ConeGeometry(0.55, 1, 16, 1, true);
    tailGeo.translate(0, -0.5, 0);
    tailGeo.rotateX(-Math.PI / 2);
    this.cometTail = new THREE.Mesh(tailGeo, new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.comet.add(this.cometTail);
    this.scene.add(this.comet);
    this.addLabel('kometa', 'kometa');

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.applyView(true);
    this.setStyle(this.style);
    this.raf = requestAnimationFrame(this.frame);
  }

  private addStars() {
    const r = rng(42);
    const geo = new THREE.BufferGeometry();
    const pos: number[] = [];
    const col: number[] = [];
    for (let i = 0; i < 4000; i++) {
      const u = r() * 2 - 1, t = r() * Math.PI * 2, d = 1500 + r() * 800;
      const s = Math.sqrt(1 - u * u);
      pos.push(Math.cos(t) * s * d, u * d, Math.sin(t) * s * d);
      const b = 0.55 + r() * 0.45;
      col.push(b, b, b * (0.9 + r() * 0.15));
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true })));
  }

  private addPlanet(p: SpacePlanet) {
    const baseR = overviewRadius(p.re);
    const holder = new THREE.Group();
    const axis = new THREE.Group();
    axis.rotation.z = THREE.MathUtils.degToRad(TILT[p.id] ?? 0);
    holder.add(axis);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), this.cartoonMaterial(planetMap(p.id)));
    this.skin(mesh, mesh.material as THREE.Material, `${p.id}.jpg`, (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 1, metalness: 0 }));
    this.addOutline(mesh);
    mesh.scale.setScalar(baseR);
    mesh.userData.id = p.id;
    axis.add(mesh);
    if (p.id === 'zeme') {
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.015, 64, 32), new THREE.MeshToonMaterial({ map: tex(cloudsMap()), gradientMap: this.toon, transparent: true, depthWrite: false }));
      this.skin(clouds, clouds.material as THREE.Material, 'zeme-mraky.jpg', (t) => new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: t, transparent: true, depthWrite: false, roughness: 1 }), false);
      mesh.add(clouds);
      const atmo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(110,170,255,0.35)', 'rgba(110,170,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      atmo.scale.setScalar(2.5);
      mesh.add(atmo);
      // Značka „Tady jsme my“ – červená tečka s bílým lemem na povrchu, vidět jen v režimu Den a noc.
      // Plochý terčík ležící na povrchu: bílý lem a červený střed.
      const rim = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      const pin = new THREE.Mesh(new THREE.CircleGeometry(0.045, 32), new THREE.MeshBasicMaterial({ color: 0xff3b3b, side: THREE.DoubleSide }));
      pin.position.z = 0.002;
      pin.raycast = () => {};
      rim.raycast = () => {};
      this.home.add(rim, pin);
      this.home.position.set(Math.cos(HOME_LAT) * Math.cos(HOME_LON), Math.sin(HOME_LAT), -Math.cos(HOME_LAT) * Math.sin(HOME_LON)).multiplyScalar(1.03);
      this.home.lookAt(this.home.position.clone().multiplyScalar(2));
      this.home.visible = false;
      mesh.add(this.home);
    }
    if (p.id === 'saturn' || p.id === 'uran') {
      const inner = p.id === 'saturn' ? 1.24 : 1.6;
      const outer = p.id === 'saturn' ? 2.3 : 1.9;
      const geo = new THREE.RingGeometry(inner, outer, 128, 1);
      // UV podél poloměru, aby pruhy prstenců šly od středu ven.
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < uv.count; i++) {
        v.fromBufferAttribute(geo.attributes.position as THREE.BufferAttribute, i);
        uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
      }
      const ring = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(ringMap(p.id)), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
      if (p.id === 'saturn') {
        this.skin(ring, ring.material as THREE.Material, 'saturn-prstence.png', (t) => new THREE.MeshStandardMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 }));
      }
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(baseR);
      ring.userData.id = p.id;
      ring.name = 'ring';
      axis.add(ring);
    }
    this.scene.add(holder);

    const R = orbitRadius(p.au);
    // Celá dráha: tenká souvislá čára v barvě planety (hlavní je zářící stopa za planetou).
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R)); }
    const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: ORBIT_COLORS[p.id] ?? 0x8fa3ff, transparent: true, opacity: 0.35 }));
    this.scene.add(orbit);
    // Stopa: oblouk za planetou, barva planety slábne do černé. Sčítání barev (additive) dělá
    // z černé průhlednost, takže stopa se dozadu rozplyne jako ohon.
    const trailPts: number[] = [];
    const trailCols: number[] = [];
    const base = new THREE.Color(ORBIT_COLORS[p.id] ?? 0x8fa3ff);
    for (let i = 0; i <= TRAIL_STEPS; i++) {
      const f = i / TRAIL_STEPS;
      const t = -f * TRAIL_ARC;
      trailPts.push(Math.cos(t) * R, 0, -Math.sin(t) * R);
      const k = Math.pow(1 - f, 1.4);
      // Plynulý přechod z barvy planety do barvy nebe – bez sčítání barev, takže se nedělají „korálky“.
      trailCols.push(SKY.r + (base.r - SKY.r) * k, SKY.g + (base.g - SKY.g) * k, SKY.b + (base.b - SKY.b) * k);
    }
    const trailGeo = new LineGeometry();
    trailGeo.setPositions(trailPts);
    trailGeo.setColors(trailCols);
    const trail = new Line2(trailGeo, new LineMaterial({ vertexColors: true, linewidth: TRAIL_WIDTH, depthWrite: false }));
    this.scene.add(trail);
    const label = this.addLabel(p.id, p.name);
    this.planets.push({ p, holder, axis, mesh, orbit, trail, baseR, label });
  }

  private cartoonMaterial(map: HTMLCanvasElement) {
    return new THREE.MeshToonMaterial({ map: tex(map), gradientMap: this.toon });
  }

  private skin(mesh: THREE.Mesh, cartoon: THREE.Material, file: string, make: (t: THREE.Texture) => THREE.Material, color = true) {
    const entry = { mesh, cartoon, file, make: (t: THREE.Texture) => { if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return make(t); } };
    this.skins.push(entry);
  }

  /** Kreslený obrys: o kousek větší koule z rubu v tmavé barvě. */
  private addOutline(mesh: THREE.Mesh) {
    const outline = new THREE.Mesh(mesh.geometry, this.outlineMat);
    outline.scale.setScalar(1.045);
    outline.raycast = () => {};
    mesh.add(outline);
    this.outlines.push(outline);
  }

  /** Přepne vzhled: opravdový (textury NASA) / kreslený (ploché barvy s obrysem). */
  setStyle(style: SolarStyle) {
    this.style = style;
    for (const k of this.skins) {
      if (style === 'realny') {
        if (!k.real) k.real = k.make(this.loader.load(TEXTURES + k.file, () => this.opts.onLook?.()));
        k.mesh.material = k.real;
      } else {
        k.mesh.material = k.cartoon;
      }
    }
    for (const o of this.outlines) o.visible = style === 'kresleny';
    this.opts.onLook?.();
  }

  private thumbRenderer: THREE.WebGLRenderer | null = null;

  /**
   * Obrázek tělesa přesně v tom vzhledu, v jakém ho model právě kreslí (opravdový / kreslený),
   * jako PNG data URL – pro boční panel. Kreslí se zvlášť malým rendererem, scéna se nemění.
   */
  thumbnail(id: SolarBodyId, size = 192): string | null {
    let src: THREE.Object3D | undefined;
    let deep = true;
    if (id === 'slunce') { src = this.sun; deep = false; }
    else if (id === 'mesic') src = this.moon;
    else src = this.planets.find((n) => n.p.id === id)?.axis;
    if (!src) return null;
    if (!this.thumbRenderer) {
      this.thumbRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.thumbRenderer.setPixelRatio(1);
      this.thumbRenderer.outputColorSpace = this.renderer.outputColorSpace;
      this.thumbRenderer.toneMapping = this.renderer.toneMapping;
    }
    const r = this.thumbRenderer;
    r.setSize(size, size, false);
    const scene = new THREE.Scene();
    const clone = src.clone(deep);
    clone.position.set(0, 0, 0);
    // Záře (sprite) a další neviditelné části by zvětšily rozměry a planeta by vyšla maličká – pryč s nimi.
    const drop: THREE.Object3D[] = [];
    clone.traverse((o) => { if ((o as THREE.Sprite).isSprite || !o.visible) drop.push(o); });
    drop.forEach((o) => o.parent?.remove(o));
    scene.add(clone);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 2.4);
    light.position.set(-4, 2, 5);
    scene.add(light);
    // Přesná krabice (podle vrcholů) a z ní poloměr = polovina nejdelší strany. Koule kolem krabice
    // by byla √3× větší a planeta by na obrázku vyšla maličká.
    const box = new THREE.Box3().setFromObject(clone, true);
    const center = box.getCenter(new THREE.Vector3());
    const dims = box.getSize(new THREE.Vector3());
    const radius = Math.max(dims.x, dims.y, dims.z) / 2;
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 2000);
    const dist = (radius / Math.sin(THREE.MathUtils.degToRad(15))) * 1.04;
    cam.position.set(center.x, center.y + dist * 0.15, center.z + dist);
    cam.lookAt(center);
    r.setClearColor(0x000000, 0);
    r.render(scene, cam);
    return r.domElement.toDataURL('image/png');
  }

  private addLabel(id: string, text: string) {
    const div = document.createElement('div');
    div.textContent = text;
    Object.assign(div.style, {
      position: 'absolute', left: '0', top: '0', transform: 'translate(-50%, 0)', whiteSpace: 'nowrap',
      font: '700 15px VisbyRound, system-ui, sans-serif', color: '#dfe6ff', textShadow: '0 1px 3px #000, 0 0 8px #000',
    });
    this.labelLayer.appendChild(div);
    this.labels.set(id, div);
    return div;
  }

  /* ---------------------------------------------------------- ovládání */

  setPlaying(v: boolean) { this.playing = v; }

  /** Zapne / vypne Závod planet: všechny planety se postaví na startovní čáru a počítají se oběhy. */
  setRace(on: boolean) {
    this.startLine.visible = on;
    // Kometa není planeta – do závodu nepatří.
    this.comet.visible = !on && this.view === 'orbit';
    this.raceLaps = '';
    if (on) {
      if (this.view !== 'orbit') { this.view = 'orbit'; this.applyView(true); }
      this.raceStart = this.years;
      for (const n of this.planets) this.phaseShift.set(n.p.id, -(n.p.phase0 + (this.years / n.p.period) * Math.PI * 2));
      this.focus = null;
      this.startFlight(true);
    } else {
      this.raceStart = null;
    }
  }

  /** Zapne / vypne Den a noc: přiblíží Zemi tak, aby byla vidět denní i noční polovina. */
  setDayNight(on: boolean) {
    if (this.dayNight === on) return;
    this.dayNight = on;
    this.home.visible = on;
    // Noční strana Země tmavší, ať je hranice dne a noci jasně vidět.
    this.ambient.intensity = on ? 0.03 : 0.12;
    // Měsíc tu s dnem a nocí nesouvisí a stál by přes Zemi.
    this.moonPivot.visible = !on && this.view === 'orbit';
    this.dayPart = null;
    if (on) {
      if (this.view !== 'orbit') { this.view = 'orbit'; this.applyView(true); }
      this.selected = 'zeme';
      this.focus = 'zeme';
      this.startFlight(false);
    } else if (this.focus === 'zeme') {
      this.startFlight(false);
    }
  }
  setSpeed(v: number) { this.speed = v; }
  setLabels(v: boolean) { this.showLabels = v; }
  setView(v: 'orbit' | 'size') {
    if (v === this.view) return;
    this.view = v;
    this.applyView(false);
  }
  /** Vybere těleso a přiblíží k němu kameru (`null` = celá soustava). */
  select(id: SolarBodyId | null) {
    if (id) this.selected = id;
    this.focus = id;
    this.startFlight(id === null);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
    });
    this.renderer.dispose();
    this.thumbRenderer?.dispose();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }

  /* ---------------------------------------------------------- interní */

  private resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Přepne mezi oběžnými drahami a řadou planet ve skutečném poměru velikostí. */
  private applyView(instant: boolean) {
    const size = this.view === 'size';
    const k = 0.5; // poloměr Země v režimu velikostí
    const sunReal = 109 * k;
    this.sun.scale.setScalar(size ? sunReal / SUN_R : 1);
    this.sunGlow.scale.setScalar(size ? sunReal * 2.6 : SUN_R * 5);
    this.belt.visible = !size;
    this.comet.visible = !size;
    let x = sunReal + 4;
    for (const n of this.planets) {
      n.orbit.visible = !size;
      n.trail.visible = !size;
      const r = size ? n.p.re * k : n.baseR;
      n.mesh.scale.setScalar(r);
      const ring = n.axis.getObjectByName('ring');
      if (ring) ring.scale.setScalar(r);
      if (size) {
        const extent = n.p.id === 'saturn' ? r * 2.3 : r;
        x += extent;
        n.holder.position.set(x, 0, 0);
        n.holder.userData.fixed = true;
        x += extent + 2.2;
      } else {
        n.holder.userData.fixed = false;
      }
    }
    this.moonPivot.visible = !size;
    this.focus = null;
    if (instant) {
      this.camera.position.copy(this.overviewCamera());
      this.controls.target.copy(this.overviewTarget());
    } else {
      this.startFlight(true);
    }
  }

  private overviewTarget() {
    return this.view === 'size' ? new THREE.Vector3(88, 0, 0) : new THREE.Vector3(0, 0, 0);
  }

  private overviewCamera() {
    return this.view === 'size' ? new THREE.Vector3(88, 8, 64) : new THREE.Vector3(0, 95, 175);
  }

  private bodyPosition(id: SolarBodyId, out = new THREE.Vector3()) {
    if (id === 'slunce') return out.set(0, 0, 0);
    if (id === 'mesic') return this.moon.getWorldPosition(out);
    if (id === 'kometa') return this.comet.getWorldPosition(out);
    return this.planets.find((n) => n.p.id === id)!.holder.getWorldPosition(out);
  }

  private bodyRadius(id: SolarBodyId) {
    if (id === 'slunce') return SUN_R * this.sun.scale.x;
    if (id === 'mesic') return 0.42;
    if (id === 'kometa') return 0.6;
    const n = this.planets.find((m) => m.p.id === id)!;
    return n.mesh.scale.x * (id === 'saturn' ? 2.3 : 1);
  }

  private startFlight(overview: boolean) {
    this.flight = { fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(), t: 0, overview };
    if (this.focus) this.bodyPosition(this.focus, this.lastFocusPos);
  }

  /** Kam se kamera dívá u vybraného tělesa: ze strany od Slunce, trochu shora, aby byla vidět osvětlená strana. */
  private focusCamera(id: SolarBodyId, target: THREE.Vector3) {
    const dist = Math.max(3.5, this.bodyRadius(id) * (id === 'slunce' ? 4 : 5.5));
    const outward = target.lengthSq() > 0.01 ? target.clone().setY(0).normalize() : new THREE.Vector3(0, 0, 1);
    const side = new THREE.Vector3(-outward.z, 0, outward.x);
    // Kamera mezi Sluncem a tělesem, mírně stranou a nahoře → vidíme den i kus noci.
    const dir = outward.clone().multiplyScalar(-0.75).add(side.multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.38, 0)).normalize();
    if (this.view === 'size' || id === 'slunce') dir.set(0.15, 0.25, 1).normalize();
    if (this.dayNight && id === 'zeme') {
      // Zboku na hranici dne a noci, trochu ze severu: vlevo den, vpravo noc, vidíme i Evropu.
      const d = outward.clone().multiplyScalar(-0.1).add(new THREE.Vector3(outward.z, 0, -outward.x)).add(new THREE.Vector3(0, 0.45, 0)).normalize();
      return target.clone().add(d.multiplyScalar(this.bodyRadius(id) * 7));
    }
    return target.clone().add(dir.multiplyScalar(dist));
  }

  private onPointerDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.down || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6) { this.down = null; return; }
    this.down = null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [this.sun, this.moon, ...this.planets.map((n) => n.mesh), ...(this.comet.visible ? [this.comet.children[0]] : [])];
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    let id = hit?.object.userData.id as SolarBodyId | undefined;
    if (!id) {
      // Malé planety jsou z dálky jen tečky – vezmi tu nejbližší ke klepnutí na obrazovce.
      let best = 28;
      const v = new THREE.Vector3();
      const all: SolarBodyId[] = ['slunce', ...this.planets.map((n) => n.p.id), ...(this.view === 'orbit' ? (['mesic', 'kometa'] as SolarBodyId[]) : [])];
      for (const b of all) {
        this.bodyPosition(b, v).project(this.camera);
        if (v.z > 1) continue;
        const d = Math.hypot(((v.x + 1) / 2) * rect.width - (e.clientX - rect.left), ((1 - v.y) / 2) * rect.height - (e.clientY - rect.top));
        if (d < best) { best = d; id = b; }
      }
    }
    if (id) {
      this.select(id);
      this.opts.onSelect(id);
    }
  };

  private frame = (now: number) => {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.playing && this.view === 'orbit') {
      this.years += dt * (this.dayNight ? DAY_NIGHT_YEARS_PER_SECOND : yearsPerSecond(this.speed));
      this.opts.onYears?.(this.years);
    }
    const spin = this.opts.still ? 0 : dt;

    for (const n of this.planets) {
      if (!n.holder.userData.fixed) {
        const a = n.p.phase0 + (this.phaseShift.get(n.p.id) ?? 0) + (this.years / n.p.period) * Math.PI * 2;
        const R = orbitRadius(n.p.au);
        n.holder.position.set(Math.cos(a) * R, 0, -Math.sin(a) * R);
        n.trail.rotation.y = a;
      }
      if (this.dayNight && n.p.id === 'zeme') {
        // Jedna otočka za den (vůči Slunci) – k otočce přidáme i posun po dráze, ať poledne zůstává poledním.
        n.mesh.rotation.y = (this.years * 365.25 + this.years) * Math.PI * 2;
      } else {
        n.mesh.rotation.y += spin * (n.p.id === 'jupiter' || n.p.id === 'saturn' ? 0.5 : 0.25);
      }
      const sel = n.p.id === this.selected;
      const mat = n.orbit.material as THREE.LineBasicMaterial;
      mat.color.set(ORBIT_COLORS[n.p.id] ?? 0x8fa3ff);
      mat.opacity = sel ? 0.7 : 0.35;
      n.trail.material.linewidth = sel ? TRAIL_WIDTH * 1.35 : TRAIL_WIDTH;
    }
    this.sun.rotation.y += spin * 0.05;
    this.moonPivot.rotation.y = this.years * Math.PI * 2 * 12.37;

    // Kometa po elipse se Sluncem v ohnisku (Keplerova rovnice).
    const P = 6, e = 0.82, A = 62;
    const M = ((this.years / P) * Math.PI * 2) % (Math.PI * 2);
    let E = M;
    for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const B = A * Math.sqrt(1 - e * e);
    const cx = A * (Math.cos(E) - e), cz = B * Math.sin(E);
    const rot = -0.6;
    this.comet.position.set(cx * Math.cos(rot) - cz * Math.sin(rot), 2, cx * Math.sin(rot) + cz * Math.cos(rot));
    const away = this.comet.position.clone().normalize();
    this.comet.lookAt(this.comet.position.clone().add(away));
    const tailLen = Math.min(26, 260 / Math.max(this.comet.position.length(), 8));
    this.cometTail.scale.set(Math.max(0.5, tailLen / 10), Math.max(0.5, tailLen / 10), tailLen);

    this.updateCamera(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
    this.updateHome();
    this.updateRace();
    this.raf = requestAnimationFrame(this.frame);
  };

  private updateCamera(dt: number) {
    const target = this.focus ? this.bodyPosition(this.focus) : this.overviewTarget();
    // Sledování: kamera se posouvá s vybraným tělesem, otáčet kolem něj jde dál.
    if (this.focus && !this.flight) {
      // Posun s tělesem a pootočení o úhel, o který se posunulo po dráze –
      // kamera tak zůstává na straně od Slunce a vidíme osvětlenou stranu.
      const offset = this.camera.position.clone().sub(this.lastFocusPos);
      if (this.view === 'orbit' && this.focus !== 'slunce' && target.lengthSq() > 0.01) {
        const turn = Math.atan2(target.x, target.z) - Math.atan2(this.lastFocusPos.x, this.lastFocusPos.z);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
      }
      this.camera.position.copy(target).add(offset);
      this.controls.target.copy(target);
    }
    if (this.flight) {
      const f = this.flight;
      f.t = this.opts.still ? 1 : Math.min(1, f.t + dt / 1.4);
      const k = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2;
      const endPos = f.overview || !this.focus ? this.overviewCamera() : this.focusCamera(this.focus, target);
      this.camera.position.lerpVectors(f.fromPos, endPos, k);
      this.controls.target.lerpVectors(f.fromTarget, target, k);
      if (f.t >= 1) this.flight = null;
    }
    this.lastFocusPos.copy(target);
  }

  /** Závod planet: hlášení počtu oběhů a popisek „Start“ na konci startovní čáry. */
  private updateRace() {
    if (!this.startLabel) {
      this.startLabel = document.createElement('div');
      this.startLabel.textContent = 'Start';
      Object.assign(this.startLabel.style, {
        position: 'absolute', left: '0', top: '0', padding: '2px 10px', borderRadius: '999px', background: '#fff', color: '#0f1d4d',
        font: '700 13px VisbyRound, system-ui, sans-serif', transform: 'translate(-50%, -140%)', display: 'none',
      });
      this.labelLayer.appendChild(this.startLabel);
    }
    if (this.raceStart === null) { this.startLabel.style.display = 'none'; return; }
    const laps = {} as Record<PlanetKey, number>;
    for (const n of this.planets) laps[n.p.id] = Math.floor((this.years - this.raceStart) / n.p.period + 1e-9);
    const key = JSON.stringify(laps);
    if (key !== this.raceLaps) { this.raceLaps = key; this.opts.onRace?.(laps); }
    const v = new THREE.Vector3(orbitRadius(30.05) + 6, 0, 0).project(this.camera);
    if (v.z > 1) { this.startLabel.style.display = 'none'; return; }
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const x = Math.min(w - 30, Math.max(30, ((v.x + 1) / 2) * w)), y = Math.min(h - 20, Math.max(30, ((1 - v.y) / 2) * h));
    Object.assign(this.startLabel.style, { display: 'block', left: `${x}px`, top: `${y}px` });
  }

  /** Popisek značky „Tady jsme my“ a hlášení, jestli je u nás den, noc, ráno nebo večer. */
  private updateHome() {
    if (!this.homeLabel) {
      this.homeLabel = document.createElement('div');
      this.homeLabel.textContent = 'Tady jsme my';
      Object.assign(this.homeLabel.style, {
        position: 'absolute', left: '0', top: '0', padding: '3px 9px', borderRadius: '999px', background: '#ff4d4d', color: '#fff',
        font: '700 13px VisbyRound, system-ui, sans-serif', whiteSpace: 'nowrap', transform: 'translate(-50%, -150%)', display: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.4)',
      });
      this.labelLayer.appendChild(this.homeLabel);
    }
    if (!this.sunHint) {
      // Světlo ze Slunce jako v modelu fází Měsíce: teplý přechod od kraje, na kterém je Slunce, a šipky světla.
      this.sunHint = document.createElement('div');
      const arrows = [1, 2, 3, 4, 5].map((i) => `<svg width="40" height="12" viewBox="0 0 40 12" style="position:absolute;left:12px;top:calc(${(i * 100) / 6}% - 6px)"><path d="M1 6H37M31 1l6 5-6 5" fill="none" stroke="rgba(255,210,120,.35)" stroke-width="2"/></svg>`).join('');
      this.sunHint.innerHTML = `${arrows}<span data-text style="position:absolute;left:68px;top:calc(${100 / 6}% - 30px);color:#ffd98a;font:700 15px VisbyRound,system-ui,sans-serif;white-space:nowrap;text-shadow:0 0 3px #060a1c,0 0 3px #060a1c,0 0 6px #060a1c">světlo ze Slunce</span>`;
      Object.assign(this.sunHint.style, { position: 'absolute', top: '0', bottom: '0', width: '35%', display: 'none', background: 'linear-gradient(90deg, rgba(255,200,90,.35), rgba(255,200,90,0))' });
      this.labelLayer.insertBefore(this.sunHint, this.labelLayer.firstChild);
    }
    if (!this.dayNight) { this.homeLabel.style.display = 'none'; this.sunHint.style.display = 'none'; return; }
    // Během přeletu kamery ukazatel nic neříká – objeví se, až je Země v záběru.
    if (this.flight) this.sunHint.style.display = 'none';
    else {
      // Na které straně obrazu je Slunce (vlevo / vpravo od Země)? Celý pruh se podle toho zrcadlí.
      const sp = new THREE.Vector3().project(this.camera);
      const earth = this.planets.find((n) => n.p.id === 'zeme')!.holder.getWorldPosition(new THREE.Vector3()).project(this.camera);
      let dx = sp.x - earth.x;
      if (sp.z > 1) dx = -dx;
      const right = dx > 0;
      Object.assign(this.sunHint.style, {
        display: 'block', left: right ? 'auto' : '0', right: right ? '0' : 'auto', transform: right ? 'scaleX(-1)' : 'none',
      });
      // Text se zrcadlením neotáčí.
      (this.sunHint.querySelector('[data-text]') as HTMLElement).style.transform = right ? 'scaleX(-1)' : 'none';
    }
    const earth = this.planets.find((n) => n.p.id === 'zeme')!;
    const center = earth.mesh.getWorldPosition(new THREE.Vector3());
    const pin = this.home.getWorldPosition(new THREE.Vector3());
    const up = pin.clone().sub(center).normalize();
    const toSun = center.clone().negate().normalize();
    const sunDot = up.dot(toSun);
    const part: DayPart = sunDot > 0.12 ? 'den' : sunDot < -0.12 ? 'noc' : sunDot >= this.lastSunDot ? 'rano' : 'vecer';
    this.lastSunDot = sunDot;
    if (part !== this.dayPart) { this.dayPart = part; this.opts.onDayPart?.(part); }
    // Popisek jen když je značka na straně Země otočené ke kameře.
    const facing = up.dot(this.camera.position.clone().sub(pin).normalize()) > 0.05;
    const v = pin.clone().project(this.camera);
    if (!facing || v.z > 1) { this.homeLabel.style.display = 'none'; return; }
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.homeLabel.style.display = 'block';
    this.homeLabel.style.left = `${((v.x + 1) / 2) * w}px`;
    this.homeLabel.style.top = `${((1 - v.y) / 2) * h}px`;
  }

  private updateLabels() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    const v = new THREE.Vector3();
    const placed: Array<[number, number, number, number]> = [];
    const entries: Array<{ id: string; div: HTMLDivElement; pos: THREE.Vector3; offset: number; priority: number }> = [];
    const camDist = (p: THREE.Vector3) => this.camera.position.distanceTo(p);
    const pxPerUnit = (p: THREE.Vector3) => h / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * camDist(p));
    entries.push({ id: 'slunce', div: this.labels.get('slunce')!, pos: new THREE.Vector3(), offset: SUN_R * this.sun.scale.x, priority: this.selected === 'slunce' ? 0 : 1 });
    for (const n of this.planets) {
      entries.push({ id: n.p.id, div: n.label, pos: n.holder.getWorldPosition(new THREE.Vector3()), offset: n.mesh.scale.x * (n.p.id === 'saturn' ? 1.3 : 1), priority: n.p.id === this.selected ? 0 : 2 });
    }
    if (this.view === 'orbit' && !this.dayNight) {
      entries.push({ id: 'mesic', div: this.labels.get('mesic')!, pos: this.moon.getWorldPosition(new THREE.Vector3()), offset: 0.42, priority: this.selected === 'mesic' ? 0 : 3 });
      entries.push({ id: 'kometa', div: this.labels.get('kometa')!, pos: this.comet.getWorldPosition(new THREE.Vector3()), offset: 0.5, priority: this.selected === 'kometa' ? 0 : 4 });
      entries.push({ id: 'pas', div: this.labels.get('pas')!, pos: new THREE.Vector3(Math.cos(2.4) * orbitRadius(2.7), 0, Math.sin(2.4) * orbitRadius(2.7)), offset: 1, priority: 5 });
    } else {
      for (const id of ['mesic', 'kometa', 'pas']) this.labels.get(id)!.style.display = 'none';
    }
    if (this.raceStart !== null) {
      const i = entries.findIndex((e) => e.id === 'kometa');
      if (i >= 0) { entries[i].div.style.display = 'none'; entries.splice(i, 1); }
    }
    if (this.dayNight) {
      // Den a noc: popisek jen u Země, ostatní by se pletly se světlem ze Slunce.
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].id !== 'zeme') { entries[i].div.style.display = 'none'; entries.splice(i, 1); }
      }
    }
    entries.sort((a, b) => a.priority - b.priority);
    // Kotouč Slunce je překážka – popisky planet se přes něj nekreslí (jinak „Merkur“ leží na Slunci).
    const sunScreen = new THREE.Vector3().project(this.camera);
    if (sunScreen.z < 1 && sunScreen.z > -1) {
      const sx = ((sunScreen.x + 1) / 2) * w, sy = ((1 - sunScreen.y) / 2) * h;
      const sr = SUN_R * this.sun.scale.x * pxPerUnit(new THREE.Vector3()) * 0.92;
      placed.push([sx - sr, sy - sr, sx + sr, sy + sr]);
    }
    const hits = (b: [number, number, number, number]) => placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    for (const e of entries) {
      v.copy(e.pos).project(this.camera);
      const visible = this.showLabels && v.z < 1 && v.z > -1;
      if (!visible) { e.div.style.display = 'none'; continue; }
      const x = ((v.x + 1) / 2) * w;
      const cy = ((1 - v.y) / 2) * h;
      const off = e.offset * pxPerUnit(e.pos);
      const halfW = e.div.offsetWidth / 2 || 30;
      // Nejdřív pod těleso, když tam překáží Slunce nebo jiný popisek, tak nad něj, jinak schovat.
      let y = cy + off + 4;
      let box: [number, number, number, number] = [x - halfW, y, x + halfW, y + 18];
      if (e.id !== 'slunce' && hits(box)) {
        const yUp = cy - off - 22;
        const boxUp: [number, number, number, number] = [x - halfW, yUp, x + halfW, yUp + 18];
        if (!hits(boxUp)) { y = yUp; box = boxUp; }
        else if (e.priority > 0) { e.div.style.display = 'none'; continue; }
      }
      placed.push(box);
      e.div.style.display = 'block';
      e.div.style.color = e.priority === 0 ? '#ffcf7a' : e.id === 'slunce' ? '#ffd98a' : e.id === 'pas' ? 'rgba(200,190,170,.7)' : '#dfe6ff';
      e.div.style.transform = `translate(${x - halfW}px, ${y}px)`;
    }
  }
}
