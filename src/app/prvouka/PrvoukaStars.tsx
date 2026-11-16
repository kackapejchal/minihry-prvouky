import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanelToggle, panelClass, MODEL_H } from './ModelPanel';
import { GameResultScreen } from '../components/GameResultScreen';
import { PrvoukaFeedbackOverlay } from './PrvoukaKit';
import { rng, prefersReducedMotion } from './space-engine';
import { CONSTELLATIONS, POLARKA_TEXT, SEASONS, constellation, projectScene, projectSky, sceneStars, type Constellation, type SceneId, type Season, type SkyStar } from './stars-data';

/**
 * Souhvězdí (3. ročník, vesmír): dva režimy.
 * Hra – dítě spojuje hvězdy Velkého vozu, najde Polárku, pak Kasiopeju a Oriona.
 * Prohlížet – souhvězdí jsou nakreslená i s popisem, učitel je promítá a vypráví.
 * Rozložení 2/3 + 1/3 stejně jako modely Sluneční soustavy a Měsíce.
 */

// Tlačítka Všechny hry / Nastavení jsou dole vlevo: na počítači uhne jen model vlevo (NAV_LEFT),
// panel vpravo jde až dolů. Na mobilu (pod sebou) uhne celá stránka.
const NAV_SPACE = 'pb-0 lg:pb-5';
const NAV_LEFT = 'lg:mb-16';
// prohlizet = model oblohy, vyber = výběr souhvězdí do hry, hra = spojovačka
type Mode = 'prohlizet' | 'vyber' | 'hra';
type Round = { type: 'connect'; c: string } | { type: 'polarka' };
const DEFAULT_PICK = ['vuz', 'kasiopeja', 'orion'];
/** Kola hry z vybraných souhvězdí (v pořadí seznamu); po Velkém voze ještě „Najdi Polárku“. */
function buildRounds(ids: string[], keepOrder = false): Round[] {
  const out: Round[] = [];
  const order = keepOrder ? ids : CONSTELLATIONS.map((c) => c.id).filter((id) => ids.includes(id));
  for (const id of order) { out.push({ type: 'connect', c: id }); if (id === 'vuz') out.push({ type: 'polarka' }); }
  return out;
}
/** Hvězdy v pořadí spojování (bez zvednutí tužky) a čísla kroků, kterými začíná nová čára. */
const stepsOf = (id: string) => constellation(id).order!.filter((x) => x !== '-');
function breaksOf(id: string) {
  const out = new Set<number>(); let i = 0;
  for (const x of constellation(id).order!) { if (x === '-') out.add(i); else i++; }
  return out;
}
const sceneOf = (r: Round): string => (r.type === 'polarka' ? 'vuz' : r.c);
const GOLD = '#ffd98a';
const HERO_DOTS: Array<[number, number, number]> = [[6, 18, 2], [14, 70, 1.5], [24, 34, 1], [37, 86, 2], [52, 12, 1.5], [63, 62, 1], [72, 26, 2], [85, 80, 1.5], [93, 44, 2], [46, 50, 1]];

interface Placed { id: string; name: string; x: number; y: number; r: number; color: string; target: boolean }

type SeasonFilter = Season | 'vse';
interface Layout { placed: Placed[]; center: { x: number; y: number } }

/** Rozmístění výřezu na plátno: hvězdy souhvězdí + rozptýlené hvězdy, na které jde taky klepnout. */
function layoutScene(sceneId: SceneId, w: number, h: number, withPolarka: boolean): Layout {
  const stars = sceneStars(sceneId, withPolarka);
  const all = sceneId === 'all';
  const proj = all ? projectSky(stars) : projectScene(stars);
  const xs = Object.values(proj).map((p) => p.x), ys = Object.values(proj).map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = w * (all ? 0.08 : 0.14), padTop = h * (all ? 0.1 : 0.14), padBottom = h * (all ? 0.08 : 0.12);
  let scale = Math.min((w - padX * 2) / Math.max(1e-6, maxX - minX), (h - padTop - padBottom) / Math.max(1e-6, maxY - minY));
  let ox = (w - (maxX - minX) * scale) / 2 - minX * scale;
  let oy = padTop + (h - padTop - padBottom - (maxY - minY) * scale) / 2 - minY * scale;
  if (all) {
    // Celá obloha: pól (Polárka) přesně uprostřed, ať se mapa může otáčet jako otočná mapa.
    const maxR = Math.max(...stars.map((s) => 90 - s.dec));
    scale = Math.min(w - padX * 2, h - padTop - padBottom) / (2 * maxR);
    ox = w / 2; oy = padTop + (h - padTop - padBottom) / 2;
  }
  const k = Math.max(0.75, Math.min(1.4, Math.min(w, h) / 650)) * (all ? 0.7 : 1);
  const size = (mag: number) => Math.max(2.4, (5.6 - mag * 1.05)) * k;
  const placed: Placed[] = stars.map((s: SkyStar) => ({
    id: s.id, name: s.name, x: ox + proj[s.id].x * scale, y: oy + proj[s.id].y * scale,
    // Polárka je o něco větší a namodralá, ať je na obloze výrazná.
    r: size(s.mag) * (s.id === 'polarka' ? 1.6 : 1), color: s.id === 'polarka' ? '#e3f3ff' : s.color ?? '#ffffff', target: true,
  }));
  // Rozptýlené jasné hvězdy (nejsou ze souhvězdí) – ať se musí hledat, ne jen klepat na všechno.
  const rnd = rng(sceneId.length * 97 + 13 + (withPolarka ? 5 : 0));
  let guard = 0;
  while (!all && placed.length < stars.length + 9 && guard++ < 400) {
    const x = w * (0.06 + rnd() * 0.88), y = h * (0.08 + rnd() * 0.8);
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < Math.min(w, h) * 0.09)) continue;
    placed.push({ id: `d${placed.length}`, name: '', x, y, r: size(1.9 + rnd() * 1.4), color: rnd() < 0.2 ? '#ffe2b8' : '#ffffff', target: false });
  }
  return { placed, center: { x: ox, y: oy } };
}

function drawStar(ctx: CanvasRenderingContext2D, p: Placed, glow = 1) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.5 * glow);
  g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4.5 * glow, 0, 6.283); ctx.fill();
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number, map = false) {
  // map = popisek na celé mapě: malý, verzálky s prostrkáním jako na tištěné otočné mapě
  ctx.font = `${map ? 600 : 700} ${size}px VisbyRound, system-ui, sans-serif`;
  (ctx as any).letterSpacing = map ? `${size * 0.03}px` : '0px';
  ctx.textAlign = 'center';
  ctx.lineWidth = map ? 3 : 4; ctx.strokeStyle = 'rgba(6,10,28,.9)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
  (ctx as any).letterSpacing = '0px';
}

const ALL_TEXT = 'Všechna souhvězdí na jedné mapě. Uprostřed je Polárka – kolem ní se celá obloha během noci pomalu otáčí. Najednou je ale nikdy neuvidíme: některá souhvězdí jsou vidět v létě, jiná v zimě. Klepni na souhvězdí a uvidíš, jak se jmenuje. Vyber roční období a mapa se otočí jako otočná mapa hvězdné oblohy.';
const seasonOf = (id: Season) => SEASONS.find((s) => s.id === id)!;
/** Natočení mapy: večerní obloha daného období dole (k jižnímu obzoru). */
const seasonRotation = (f: SeasonFilter) => (f === 'vse' || f === 'cely-rok' ? 0 : Math.PI / 2 - (seasonOf(f).ra / 12) * Math.PI);

const FAINT = (() => { const r = rng(5); return Array.from({ length: 260 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 1.1, a: 0.2 + r() * 0.5, tw: r() * 6.28 })); })();

/** model = Model hvězdné oblohy (prohlížení + zkratka do hry), hra = samostatná hra Souhvězdí (výběr a spojovačka). */
export function PrvoukaStars({ settings, variant = 'model' }: { settings?: Record<string, any>; variant?: 'model' | 'hra' }) {
  const isGame = variant === 'hra';
  // Model: v nastavení jde zaškrtnout víc ročních období – model pak nabídne jen ta (a souhvězdí kolem Polárky).
  const ALL4: Season[] = ['jaro', 'leto', 'podzim', 'zima'];
  const modelSeasons: Season[] = Array.isArray(settings?.seasons) && settings!.seasons.length ? ALL4.filter((x) => settings!.seasons.includes(x)) : ALL4;
  const allSeasons = modelSeasons.length === ALL4.length;
  // Pokročilé nastavení: čím začít (dnešní období podle měsíce: jaro 3–5, léto 6–8, podzim 9–11, zima 12–2).
  const today = (): Season => { const m = new Date().getMonth() + 1; return m >= 3 && m <= 5 ? 'jaro' : m >= 6 && m <= 8 ? 'leto' : m >= 9 && m <= 11 ? 'podzim' : 'zima'; };
  const startSetting = (settings?.start ?? 'dnes') === 'dnes' ? today() : ALL4.includes(settings?.start) ? (settings!.start as Season) : null;
  const startSeason: SeasonFilter = startSetting && modelSeasons.includes(startSetting) ? startSetting : allSeasons ? 'vse' : modelSeasons[0];
  const namesAlways = settings?.names === 'vzdy';
  const pickFor = (f: SeasonFilter) => (f === 'vse' ? DEFAULT_PICK : CONSTELLATIONS.filter((x) => x.season === f).map((x) => x.id));
  const still = useMemo(prefersReducedMotion, []);
  // Hra bere souhvězdí z nastavení hry (zaškrtávací seznam) a začíná rovnou spojovačkou.
  // Z vybraných ročních období se souhvězdí losují náhodně (při každé nové hře znovu).
  const gameSeasons: string[] = Array.isArray(settings?.seasons) && settings!.seasons.length ? settings!.seasons : ['cely-rok'];
  const gameCount = Number(settings?.rounds) || 5;
  // Kreslení (jako v Písance): dítě vede čáru prstem / perem od hvězdy k hvězdě, čára zůstane, jak ji nakreslí.
  const drawMode = isGame && settings?.draw === 'kresli';
  const strokes = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const active = useRef<Array<{ x: number; y: number }> | null>(null);
  const stepRef = useRef(0);
  // stepRef.current se drží s krokem (pro tahání prstem, kde se nečeká na nové vykreslení).
  const drawPick = () => {
    const pool = CONSTELLATIONS.filter((x) => gameSeasons.includes(x.season)).map((x) => x.id);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, gameCount);
  };
  const gamePick: string[] = useMemo(drawPick, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useState<Mode>(isGame ? 'hra' : 'prohlizet');
  const [picked, setPicked] = useState<string[]>(() => pickFor(startSeason));
  const [rounds, setRounds] = useState<Round[]>(() => buildRounds(isGame ? gamePick : DEFAULT_PICK, isGame));
  const [view, setView] = useState<SceneId>('all');
  const [season, setSeason] = useState<SeasonFilter>(isGame ? 'vse' : startSeason);
  const rot = useRef(0);
  const zoom = useRef({ z: 1, x: 0, y: 0 });
  const lastT = useRef(0);
  // Při otevření (a změně velikosti) se mapa rovnou postaví na místo, plynule se otáčí jen při přepnutí období.
  const snapMap = useRef(true);
  // Celá obloha: souhvězdí pod myší (rozsvítí se a ukáže jméno) a poslední polohy hvězd na obrazovce.
  const hover = useRef<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const setHover = (id: string | null) => { if (hover.current !== id) { hover.current = id; setHoverId(id); } };
  const skyPos = useRef<Record<string, Placed>>({});
  // Hra
  const [round, setRound] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  // Po výběru souhvězdí nebo období v menu se menu zavře, ať je vidět obloha.
  useEffect(() => { setPanelOpen(false); }, [view, season]);
  // Spojovačka podle čísel: kolik hvězd z pořadí už dítě spojilo.
  const [step, setStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [cleanRounds, setCleanRounds] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; hint?: string; info?: string } | null>(null);
  const flash = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });

  const sceneId: SceneId = mode !== 'hra' ? view : sceneOf(rounds[round]);
  // Ve hře je Polárka jen v kole „Najdi Polárku“ – v prvním kole je vůz přes celou oblohu.
  const withPolarka = mode !== 'hra' ? view === 'vuz' || view === 'all' : rounds[round].type === 'polarka';
  const { placed, center } = useMemo(() => layoutScene(sceneId, box.w, box.h, withPolarka), [sceneId, box.w, box.h, withPolarka]);
  const byId = useMemo(() => Object.fromEntries(placed.map((p) => [p.id, p])), [placed]);
  const r = rounds[round];
  const c = r.type === 'connect' ? constellation(r.c) : null;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { snapMap.current = true; setBox({ w: el.clientWidth, h: el.clientHeight }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetRound = (i: number) => {
    strokes.current = []; active.current = null; stepRef.current = 0;
    setRound(i); setStep(0); setMistakes(0); setRoundDone(false);
  };
  const restart = () => { if (isGame) setRounds(buildRounds(drawPick(), true)); setCleanRounds(0); setFinished(false); resetRound(0); };
  const openPicker = () => {
    setPicked(pickFor(season));
    setMode('vyber');
  };
  const startGame = () => { setRounds(buildRounds(picked)); setCleanRounds(0); setFinished(false); resetRound(0); setMode('hra'); };
  const showOnSky = (id: string) => { setView(id); setMode('prohlizet'); };

  // Kreslení: každé snímek (třpyt hvězd, blikání hvězdy, kde se začíná).
  const stateRef = useRef({ mode, placed, byId, center, step, round, roundDone, view, mistakes, season, rounds });
  stateRef.current = { mode, placed, byId, center, step, round, roundDone, view, mistakes, season, rounds };
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const cv = canvasRef.current;
      if (cv) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
        const ctx = cv.getContext('2d')!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paint(ctx, w, h, now / 1000);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function paint(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    const st = stateRef.current;
    const prevT = lastT.current; lastT.current = t;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05081a'); g.addColorStop(1, '#101a45');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (const s of FAINT) {
      ctx.globalAlpha = s.a * (still ? 1 : 0.7 + 0.3 * Math.sin(t * 1.4 + s.tw));
      ctx.fillStyle = '#fff'; ctx.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    // obzor
    ctx.fillStyle = '#070b1f';
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let i = 0; i <= 14; i++) ctx.lineTo((w * i) / 14, h * (0.955 + 0.02 * Math.sin(i * 1.9)));
    ctx.lineTo(w, h); ctx.fill();

    const fs = Math.round(Math.max(14, Math.min(w, h) / 32));
    const line = (a: Placed, b: Placed, alpha = 0.9, glow = false) => {
      ctx.strokeStyle = `rgba(255,217,138,${alpha})`; ctx.lineWidth = glow ? 3.5 : 3; ctx.lineCap = 'round';
      if (glow) { ctx.shadowColor = 'rgba(255,200,90,.9)'; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.shadowBlur = 0;
    };
    const polarkaGuide = (full: boolean) => {
      const merak = st.byId.merak, dubhe = st.byId.dubhe, pol = st.byId.polarka;
      if (!merak || !dubhe || !pol) return;
      const dx = dubhe.x - merak.x, dy = dubhe.y - merak.y;
      ctx.save();
      ctx.setLineDash([6, 7]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(127,211,255,.85)';
      ctx.beginPath(); ctx.moveTo(merak.x, merak.y);
      if (full) ctx.lineTo(pol.x, pol.y); else ctx.lineTo(dubhe.x + dx * 1.05, dubhe.y + dy * 1.05);
      ctx.stroke();
      ctx.restore();
      if (full) {
        // pět dílků po vzdálenosti zadních hvězd
        const L = Math.hypot(pol.x - dubhe.x, pol.y - dubhe.y), step = Math.hypot(dx, dy), ux = (pol.x - dubhe.x) / L, uy = (pol.y - dubhe.y) / L;
        ctx.fillStyle = '#7fd3ff';
        for (let i = 1; i * step < L - step * 0.4; i++) { ctx.beginPath(); ctx.arc(dubhe.x + ux * step * i, dubhe.y + uy * step * i, 3.5, 0, 6.283); ctx.fill(); }
      }
    };

    if (st.mode !== 'hra') {
      const all = st.view === 'all';
      // 2 = vybrané období, 1 = vidět po celý rok (k vybranému období), 0 = jindy
      const lvl = (cons: Constellation) => (!all || st.season === 'vse' || cons.season === st.season ? 2 : cons.season === 'cely-rok' ? 1 : 0);
      const list = all ? CONSTELLATIONS : [constellation(st.view)];
      const starLvl: Record<string, number> = { polarka: 2 };
      for (const cons of list) for (const s of cons.stars) starLvl[s.id] = Math.max(starLvl[s.id] ?? 0, lvl(cons));
      let pl = st.placed, by = st.byId;
      if (all) {
        // Otočná mapa: plynule natočit k vybranému ročnímu období a přiblížit jeho část oblohy.
        // Plynulé dojetí podle skutečného času (stejně rychle i při trhaném vykreslování).
        const k = 1 - Math.exp(-Math.min(0.5, Math.max(0, t - prevT)) * 5);
        const ease = (cur: number, target: number) => (still || snapMap.current || Math.abs(target - cur) < 1e-3 ? target : cur + (target - cur) * k);
        let d = seasonRotation(st.season) - rot.current;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        rot.current = ease(rot.current, rot.current + d);
        const ca = Math.cos(rot.current), sa = Math.sin(rot.current), { x: cx, y: cy } = st.center;
        const turned = st.placed.map((p) => ({ ...p, x: cx + (p.x - cx) * ca - (p.y - cy) * sa, y: cy + (p.x - cx) * sa + (p.y - cy) * ca }));
        let tz = 1, tcx = w / 2, tcy = h / 2;
        if (st.season !== 'vse') {
          const vis = turned.filter((p) => starLvl[p.id] === 2); // souhvězdí období + Polárka
          const x0 = Math.min(...vis.map((p) => p.x)), x1 = Math.max(...vis.map((p) => p.x));
          const y0 = Math.min(...vis.map((p) => p.y)), y1 = Math.max(...vis.map((p) => p.y));
          tz = Math.min(2.4, (w * 0.84) / Math.max(1, x1 - x0), (h * 0.74) / Math.max(1, y1 - y0));
          tcx = (x0 + x1) / 2; tcy = (y0 + y1) / 2 - (h * 0.02) / tz;
        }
        const z = zoom.current;
        if (z.x === 0 && z.y === 0) { z.x = w / 2; z.y = h / 2; }
        z.z = ease(z.z, tz); z.x = ease(z.x, tcx); z.y = ease(z.y, tcy);
        snapMap.current = false;
        pl = turned.map((p) => ({ ...p, x: w / 2 + (p.x - z.x) * z.z, y: h / 2 + (p.y - z.y) * z.z }));
        by = Object.fromEntries(pl.map((p) => [p.id, p]));
        skyPos.current = by;
      }
      const vse = all && st.season === 'vse';
      if (vse) {
        // Otočná mapa: kruh oblohy s jemným okrajem, ať mapa nepůsobí jako rozsypané čáry.
        const pole = by.polarka;
        const R = Math.max(...pl.filter((p) => (starLvl[p.id] ?? 0) >= 1).map((p) => Math.hypot(p.x - pole.x, p.y - pole.y))) + fs * 2.2;
        const g = ctx.createRadialGradient(pole.x, pole.y, 0, pole.x, pole.y, R);
        g.addColorStop(0, 'rgba(70,95,200,.20)'); g.addColorStop(1, 'rgba(70,95,200,.06)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pole.x, pole.y, R, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(170,190,255,.28)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(170,190,255,.14)';
        ctx.beginPath(); ctx.arc(pole.x, pole.y, R * 0.5, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
      }
      // Postava souhvězdí ze starého atlasu (Hevelius 1690, volné dílo) – napasovaná na dvě hvězdy.
      
      for (const cons of list) {
        const l = lvl(cons);
        for (const [a, b] of cons.edges) {
          const pick = all && !vse && l === 2;
          if (vse) {
            // Souhvězdí pod myší: modře (jako vybraný Měsíc v modelu fází Měsíce), ostatní se ztlumí.
            const hv = hover.current === cons.id, dim = hover.current && !hv;
            if (hv) { ctx.shadowColor = 'rgba(127,211,255,.9)'; ctx.shadowBlur = 10; }
            ctx.strokeStyle = hv ? '#7fd3ff' : dim ? 'rgba(255,217,138,.35)' : 'rgba(255,217,138,.62)'; ctx.lineWidth = hv ? 3 : 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(by[a].x, by[a].y); ctx.lineTo(by[b].x, by[b].y); ctx.stroke(); ctx.shadowBlur = 0; }
          else if (all) { if (l === 0) continue; ctx.strokeStyle = l === 2 ? 'rgba(255,217,138,.95)' : 'rgba(255,217,138,.22)'; ctx.lineWidth = l === 2 ? 2.4 : 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(by[a].x, by[a].y); ctx.lineTo(by[b].x, by[b].y); ctx.stroke(); }
          else line(by[a], by[b], 0.9);
        }
      }
      if (st.view === 'vuz') polarkaGuide(true);
      for (const p of pl) { const l = starLvl[p.id] ?? 2; ctx.globalAlpha = l === 2 ? 1 : l === 1 ? 0.4 : all && !vse ? 0 : 0.2; drawStar(ctx, vse ? { ...p, r: p.r * 0.8 } : p, p.id === 'polarka' ? 1.5 : vse ? 0.6 : 1); }
      ctx.globalAlpha = 1;
      // Popisky bez překrývání: každý dostane místo, kde nezakryje jiný popisek.
      type Box = { x0: number; x1: number; y0: number; y1: number };
      const boxes: Box[] = [], labs: Box[] = [];
      const area = (bx: Box, list2: Box[]) => list2.reduce((acc, o) => acc + Math.max(0, Math.min(bx.x1, o.x1) - Math.max(bx.x0, o.x0)) * Math.max(0, Math.min(bx.y1, o.y1) - Math.max(bx.y0, o.y0)), 0);
      // Překryv s jiným popiskem je mnohem horší než přes kousek čáry.
      const overlap = (bx: Box) => (vse ? 0 : area(bx, boxes)) + area(bx, labs) * 60;
      // Popisky ať nezakrývají ani hvězdy souhvězdí (a body uprostřed čar).
      for (const cons of list) {
        if (lvl(cons) === 0 && !vse) continue;
        for (const st2 of cons.stars) { const p = by[st2.id]; boxes.push({ x0: p.x - 7, x1: p.x + 7, y0: p.y - 7, y1: p.y + 7 }); }
        for (const [a, b] of cons.edges) for (const t of [0.25, 0.5, 0.75]) { const x = by[a].x + (by[b].x - by[a].x) * t, y = by[a].y + (by[b].y - by[a].y) * t; boxes.push({ x0: x - 4, x1: x + 4, y0: y - 4, y1: y + 4 }); }
      }
      const place = (text: string, size: number, spots: Array<[number, number]>, color: string, force = true) => {
        const half = text.length * size * 0.3 + 3;
        let best: { x: number; y: number; o: number } | null = null;
        for (const [x, y] of spots) {
          const cx = Math.min(w - half - 4, Math.max(half + 4, x)), cy = Math.max(size + 4, Math.min(h - 6, y));
          const o = overlap({ x0: cx - half, x1: cx + half, y0: cy - size, y1: cy + 3 });
          if (!best || o < best.o) best = { x: cx, y: cy, o };
          if (o === 0) break;
        }
        if (!best || (!force && best.o > 0)) return;
        labs.push({ x0: best.x - half, x1: best.x + half, y0: best.y - size, y1: best.y + 3 });
        label(ctx, text, best.x, best.y, color, size, vse);
      };
      if (st.view === 'vuz' || st.view === 'maly-vuz' || all) {
        const p = by.polarka, size = all ? (vse ? Math.max(10, fs - 5) : fs - 3) : fs;
        place(st.view === 'vuz' ? 'Polárka – sever' : 'Polárka', size, all ? [[p.x, p.y + p.r + size + 6], [p.x, p.y - p.r - 10]] : [[p.x, p.y - p.r - 14]], '#7fd3ff');
      }
      for (const cons of list) {
        const l = lvl(cons);
        if (l === 0) continue;
        if (vse && !namesAlways && hover.current !== cons.id) continue; // na celé mapě jméno jen u souhvězdí pod myší
        const ts = cons.stars.map((s) => by[s.id]);
        const x0 = Math.min(...ts.map((p) => p.x)), x1 = Math.max(...ts.map((p) => p.x));
        const top = Math.min(...ts.map((p) => p.y)), bottom = Math.max(...ts.map((p) => p.y));
        const cx = (x0 + x1) / 2, cy = (top + bottom) / 2;
        if (all && !vse && l === 1 && cons.id !== 'vuz') continue;
        const size = all ? (vse ? Math.max(11, fs - 5) : l === 2 ? fs : Math.max(11, fs - 4)) : fs + 4;
        const half = cons.name.length * size * 0.29;
        // Na celé mapě je jméno přímo v obrazci (v těžišti hvězd), jako v planetáriu – je jasné, ke kterému patří.
        const mx = ts.reduce((a2, p) => a2 + p.x, 0) / ts.length, my = ts.reduce((a2, p) => a2 + p.y, 0) / ts.length;
        const spots: Array<[number, number]> = vse
          ? [[mx, my + size / 3], [mx, my + size * 1.5], [mx, my - size * 0.8], [mx, bottom + size + 4], [mx, top - 6]]
          : all
            ? [[cx, top - 8], [cx, bottom + size + 6], [x1 + half + 8, cy + size / 3], [x0 - half - 8, cy + size / 3], [cx, cy + size / 3]]
            // U jednoho souhvězdí nahoře; když tam už je jiný popisek (Polárka u Malého vozu), tak dole nebo z boku.
            : [[cx, Math.max(fs + 6, top - 26)], [cx, bottom + size + 22], [x1 + half + 26, cy + size / 3], [x0 - half - 26, cy + size / 3]];
        place(cons.name, size, spots, vse ? (hover.current === cons.id ? '#7fd3ff' : 'rgba(255,224,160,.85)') : l === 2 ? GOLD : 'rgba(255,217,138,.45)');
        // Jména jasných hvězd: u jednoho souhvězdí vždy, na celé obloze jen u vybraného období.
        if (!all || (!vse && l === 2)) for (const id of cons.named ?? []) {
          if (id === 'polarka') continue;
          const p = by[id], sz = all ? Math.max(11, fs - 4) : fs - 2;
          place(p.name, sz, [[p.x, p.y + p.r + fs + (all ? 2 : 6)], [p.x, p.y - p.r - 8], [p.x + p.r + p.name.length * sz * 0.3 + 8, p.y + sz / 3], [p.x - p.r - p.name.length * sz * 0.3 - 8, p.y + sz / 3]], '#dfe6ff', false);
        }
      }
      return;
    }

    const rr = st.rounds[st.round];
    if (rr.type === 'polarka' || (rr.type === 'connect' && rr.c === 'vuz' && st.roundDone)) {
      for (const [a, b] of constellation('vuz').edges) line(st.byId[a], st.byId[b], rr.type === 'polarka' ? 0.6 : 0.9);
    }
    if (rr.type === 'connect') {
      const ord = stepsOf(rr.c), brk = breaksOf(rr.c);
      if (drawMode && !st.roundDone) {
        // Přerušovaná vodicí čára k další hvězdě (jako v Písance) a čáry, které dítě nakreslilo.
        if (st.step > 0 && !brk.has(st.step) && st.step < ord.length) {
          const a = st.byId[ord[st.step - 1]], b = st.byId[ord[st.step]];
          ctx.save(); ctx.setLineDash([7, 8]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(220,228,255,.55)';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
        }
        ctx.strokeStyle = 'rgba(255,217,138,.95)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const pts of [...strokes.current, ...(active.current ? [active.current] : [])]) {
          if (pts.length < 2) continue;
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const q of pts) ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      } else for (let i = 1; i < st.step; i++) if (!brk.has(i)) line(st.byId[ord[i - 1]], st.byId[ord[i]]);
    }
    if (rr.type === 'polarka') {
      polarkaGuide(st.roundDone);
      for (const id of ['merak', 'dubhe']) {
        const p = st.byId[id];
        ctx.strokeStyle = 'rgba(127,211,255,.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9, 0, 6.283); ctx.stroke();
      }
    }
    for (const p of st.placed) drawStar(ctx, p, p.id === 'polarka' ? 1.5 : 1);
    // Čísla u hvězd (spojovačka). Hvězda, přes kterou se jde dvakrát, má dvě čísla vedle sebe.
    if (rr.type === 'connect' && !st.roundDone) {
      const ord = stepsOf(rr.c);
      const nums: Record<string, number[]> = {};
      ord.forEach((id, i) => { (nums[id] ??= []).push(i); });
      const br = Math.max(Math.min(w, h) < 420 ? 9 : 11, fs * 0.62);
      // Čísla si hledají volné místo kolem hvězdy (vpravo nahoře, vlevo nahoře, vpravo dole…), ať se nepřekrývají.
      const taken: Array<{ x: number; y: number }> = [];
      const starPts = Object.keys(nums).map((id) => st.byId[id]);
      const dirs = [[1, -1], [-1, -1], [1, 1], [-1, 1], [1.35, 0], [-1.35, 0], [0, -1.35], [0, 1.35]];
      for (const [id, list] of Object.entries(nums)) {
        const p = st.byId[id];
        // Číslo hvězdy, která už je spojená, zmizí – zůstanou jen ta, na která se ještě klepe.
        list.filter((i) => i >= st.step).forEach((i) => {
          let bx = p.x + p.r + br + 2, by = p.y - p.r - br - 2, bestScore = Infinity;
          for (const ring of [1, 1.8]) for (const [dx, dy] of dirs) {
            const x = p.x + dx * (p.r + br + 2) * ring, y = p.y + dy * (p.r + br + 2) * ring;
            const hits = taken.filter((q) => Math.hypot(q.x - x, q.y - y) < br * 2 + 1).length * 10
              + starPts.filter((q) => q !== p && Math.hypot(q.x - x, q.y - y) < br + q.r + 2).length * 3
              + (x < br || y < br || x > w - br || y > h - br ? 20 : 0) + (ring > 1 ? 1 : 0);
            if (hits < bestScore) { bestScore = hits; bx = x; by = y; }
            if (hits === 0) break;
          }
          taken.push({ x: bx, y: by });
          const isNext = i === st.step;
          ctx.fillStyle = isNext ? '#f0a12c' : 'rgba(255,255,255,.92)';
          ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.fill();
          ctx.font = `700 ${Math.round(br * 1.15)}px VisbyRound, system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = isNext ? '#2a1700' : '#0f1d4d';
          ctx.fillText(String(i + 1), bx, by + 1);
          ctx.textBaseline = 'alphabetic';
        });
      }
    }
    // Další hvězda, na kterou se má klepnout: pulzující kroužek.
    const pulseAt = rr.type === 'connect' && !st.roundDone ? st.byId[stepsOf(rr.c)[st.step]] : null;
    if (pulseAt) {
      const k = still ? 0.5 : (Math.sin(t * 4) + 1) / 2;
      ctx.strokeStyle = `rgba(240,161,44,${0.55 + 0.4 * k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pulseAt.x, pulseAt.y, pulseAt.r + 10 + k * 5, 0, 6.283); ctx.stroke();
    }
    if (st.roundDone) {
      if (rr.type === 'polarka') { const p = st.byId.polarka; label(ctx, 'Polárka – sever', p.x, p.y - p.r - 14, '#7fd3ff', fs); }
      else { const cons = constellation(rr.c); const ts = cons.stars.map((s) => st.byId[s.id]); label(ctx, cons.name, ts.reduce((a, p) => a + p.x, 0) / ts.length, Math.max(fs + 6, Math.min(...ts.map((p) => p.y)) - 26), GOLD, fs + 4); }
    }
    const f = flash.current;
    if (f && t * 1000 - f.t < 600) {
      const a = 1 - (t * 1000 - f.t) / 600;
      ctx.strokeStyle = f.ok ? `rgba(120,230,150,${a})` : `rgba(255,90,90,${a})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(f.x, f.y, 18 + (1 - a) * 14, 0, 6.283); ctx.stroke();
    }
  }

  /** Na celé obloze: které souhvězdí je pod prstem / myší (nejbližší hvězda do 26 px). */
  const skyHit = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let id: string | null = null, best = 26;
    for (const cons of CONSTELLATIONS) for (const st2 of cons.stars) {
      const p = skyPos.current[st2.id]; if (!p) continue;
      const d = Math.hypot(p.x - x, p.y - y); if (d < best) { best = d; id = cons.id; }
    }
    return id;
  };
  const skyActive = mode !== 'hra' && view === 'all' && season === 'vse';
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!skyActive) { setHover(null); return; }
    setHover(skyHit(e));
    e.currentTarget.style.cursor = hover.current ? 'pointer' : 'default';
  };
  // ——— Kreslení prstem ———
  const pt = (e: React.PointerEvent<HTMLCanvasElement>) => { const rc = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - rc.left, y: e.clientY - rc.top }; };
  const reach = (n: number) => {
    const ord = stepsOf(c!.id);
    stepRef.current = n; setStep(n);
    if (n === ord.length) { setRoundDone(true); setFeedback({ isCorrect: true, info: c!.text }); if (mistakes === 0) setCleanRounds((k) => k + 1); }
  };
  const drawDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ord = stepsOf(c!.id), brk = breaksOf(c!.id), s = stepRef.current, p = pt(e);
    const startNew = s === 0 || brk.has(s);
    const startId = startNew ? ord[s] : ord[s - 1], sp = byId[startId];
    if (Math.hypot(sp.x - p.x, sp.y - p.y) > 44) {
      if (placed.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 30)) {
        flash.current = { x: p.x, y: p.y, t: performance.now(), ok: false };
        setMistakes((m) => m + 1);
        setFeedback({ isCorrect: false, hint: `Začni u hvězdy s číslem ${startNew ? s + 1 : s}.` });
      }
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = [{ x: sp.x, y: sp.y }];
    if (startNew) { flash.current = { x: sp.x, y: sp.y, t: performance.now(), ok: true }; reach(s + 1); }
  };
  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active.current) return;
    const ord = stepsOf(c!.id), brk = breaksOf(c!.id), s = stepRef.current, p = pt(e);
    active.current.push(p);
    const tp = byId[ord[s]];
    if (tp && Math.hypot(tp.x - p.x, tp.y - p.y) < 32) {
      // Dojel ke správné hvězdě: čára se k ní dotáhne a kreslí se dál od ní.
      active.current.push({ x: tp.x, y: tp.y });
      strokes.current.push(active.current);
      flash.current = { x: tp.x, y: tp.y, t: performance.now(), ok: true };
      const n = s + 1;
      active.current = n < ord.length && !brk.has(n) ? [{ x: tp.x, y: tp.y }] : null;
      reach(n);
    }
  };
  const drawUp = () => {
    const pts = active.current; active.current = null;
    if (!pts || pts.length < 2) return;
    const moved = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
    if (moved > 30 && !roundDone) {
      setMistakes((m) => m + 1);
      setFeedback({ isCorrect: false, hint: `Veď čáru až k hvězdě s číslem ${stepRef.current + 1}.` });
    }
  };
  const isDrawing = drawMode && mode === 'hra' && r.type === 'connect' && !roundDone && !feedback;

  const onTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) { drawDown(e); return; }
    if (skyActive) {
      const id = skyHit(e);
      if (!id) return;
      // Myš: jméno už je vidět, klepnutí souhvězdí otevře. Dotyk: první klepnutí ukáže jméno, druhé otevře.
      if (e.pointerType === 'mouse' || hover.current === id) { setHover(null); setView(id); } else setHover(id);
      return;
    }
    if (mode !== 'hra' || roundDone || feedback) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let hit: Placed | null = null, best = 30;
    for (const p of placed) { const d = Math.hypot(p.x - x, p.y - y); if (d < best) { best = d; hit = p; } }
    if (!hit) return;
    const now = performance.now();
    if (r.type === 'polarka') {
      const ok = hit.id === 'polarka';
      flash.current = { x: hit.x, y: hit.y, t: now, ok };
      if (ok) { setRoundDone(true); setFeedback({ isCorrect: true, info: POLARKA_TEXT }); if (mistakes === 0) setCleanRounds((n) => n + 1); }
      else { setMistakes((m) => m + 1); setFeedback({ isCorrect: false, hint: 'Prodluž čáru od dvou modře označených hvězd asi pětkrát.' }); }
      return;
    }
    const ord = stepsOf(c!.id);
    const ok = hit.id === ord[step];
    flash.current = { x: hit.x, y: hit.y, t: now, ok };
    if (!ok) { setMistakes((m) => m + 1); setFeedback({ isCorrect: false, hint: `Hledej hvězdu s číslem ${step + 1}.` }); return; }
    setStep(step + 1);
    if (step + 1 === ord.length) { setRoundDone(true); setFeedback({ isCorrect: true, info: c!.text }); if (mistakes === 0) setCleanRounds((n) => n + 1); }
  };

  const next = () => { if (round + 1 < rounds.length) resetRound(round + 1); else setFinished(true); };
  // Po správně spojeném souhvězdí (a okně SPRÁVNĚ!) se samo přejde na další kolo – chvíli zůstane vidět hotový tvar a text.
  useEffect(() => {
    if (mode !== 'hra' || !roundDone || feedback || finished) return;
    // Text už byl v okně SPRÁVNĚ!, takže hned po jeho zavření další kolo.
    const t = setTimeout(next, isGame ? 300 : 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roundDone, feedback, finished, round]);

  const task = r.type === 'polarka'
    ? 'Najdi Polárku. Dvě modře označené hvězdy vozu ukazují k ní – jejich vzdálenost prodluž asi pětkrát a klepni na hvězdu, kterou tam najdeš.'
    : step === 0
      ? `Spoj hvězdy souhvězdí ${c!.name} podle čísel. Začni hvězdou s číslem 1.`
      : breaksOf(c!.id).has(step)
        ? `Tahle čára je hotová. Novou čáru začni u hvězdy s číslem ${step + 1}.`
        : `Teď klepni na hvězdu s číslem ${step + 1}.`;
  const drawTask = r.type === 'connect' && drawMode
    ? step === 0
      ? `Polož prst na hvězdu s číslem 1 a veď čáru po souhvězdí ${c!.name} podle čísel.`
      : breaksOf(c!.id).has(step)
        ? `Tahle čára je hotová. Zvedni prst a novou čáru začni u hvězdy s číslem ${step + 1}.`
        : `Veď čáru po přerušované cestě k hvězdě s číslem ${step + 1}.`
    : null;
  const doneText = r.type === 'polarka' ? POLARKA_TEXT : c!.text;

  return (
    <div className={`w-full lg:h-[100svh] bg-[#eef1f8] p-3 md:p-5 ${settings ? NAV_SPACE : ''} grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,29vw)] lg:grid-rows-[minmax(0,1fr)]`}>
      {/* Model oblohy: na telefonu/tabletu panel v menu vpravo nahoře. Ve hře zůstává panel pod oblohou – je v něm zadání. */}
      <div className={`relative rounded-3xl overflow-hidden bg-[#05081a] ${isGame ? 'min-h-[60svh] lg:min-h-0' : MODEL_H} ${settings ? NAV_LEFT : ''}`}>
        {!isGame ? <PanelToggle open={panelOpen} onToggle={() => setPanelOpen((v) => !v)} label="Souhvězdí" /> : null}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none', cursor: mode === 'hra' && !roundDone ? 'pointer' : 'default' }} onPointerDown={onTap} onPointerMove={(e) => (isDrawing ? drawMove(e) : onMove(e))} onPointerUp={drawUp} onPointerCancel={drawUp} onPointerLeave={() => setHover(null)} aria-label="Noční obloha se souhvězdím" />
      </div>

      <aside className={isGame ? "rounded-3xl bg-white text-[#0f1d4d] flex flex-col min-w-0 overflow-hidden lg:overflow-y-auto" : panelClass(panelOpen)}>
        <div className="relative flex-shrink-0 px-5 pt-5 pb-5 text-white" style={{ background: 'linear-gradient(180deg, #121c55 0%, #0b1236 100%)' }}>
          {/* Ve hře a ve výběru je „zpět“ nahoře, stejně jako u Závodu planet ve Sluneční soustavě. */}
          {!isGame && mode !== 'prohlizet' ? (
            <div className="flex">
              <button
                type="button"
                onClick={() => setMode(isGame ? 'vyber' : 'prohlizet')}
                className="vb-btn vb-btn-dark"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                {mode === 'hra' ? (isGame ? 'Jiná souhvězdí' : 'Konec hry') : 'Zpět na oblohu'}
              </button>
            </div>
          ) : null}
          {HERO_DOTS.map(([x, y, r], i) => (
            <span key={i} className="absolute rounded-full pointer-events-none bg-white" style={{ left: `${x}%`, top: `${y}%`, width: r, height: r, opacity: 0.7 }} />
          ))}
          {mode === 'prohlizet' ? (
            <p className="relative text-xs font-bold uppercase tracking-widest text-[#9aa6d1] text-center">
              {view === 'all' ? (season === 'vse' ? 'Mapa oblohy' : `${seasonOf(season).icon} ${seasonOf(season).name}`) : `${seasonOf(constellation(view).season).icon} ${seasonOf(constellation(view).season).name}`}
            </p>
          ) : null}
          <h2 className={`relative text-3xl font-bold ${mode === 'prohlizet' ? 'mt-1 text-center' : 'mt-3'}`}>{mode === 'prohlizet' ? (view === 'all' ? (season === 'vse' ? 'Celá obloha' : `Obloha ${seasonOf(season).on}`) : constellation(view).name) : mode === 'vyber' ? 'Spoj souhvězdí' : r.type === 'polarka' ? 'Polárka' : c!.name}</h2>
          {mode === 'prohlizet' ? (
            // Jako řada planet ve Sluneční soustavě: souhvězdí nakreslená zlatě přes celou šířku.
            <div className="relative mt-3 h-28 flex items-center justify-center gap-3">
              {view === 'all'
                ? (season === 'vse' ? ['kasiopeja', 'vuz', 'labut', 'orion'] : CONSTELLATIONS.filter((x) => x.season === season).slice(0, 4).map((x) => x.id)).map((id, i, arr) => (
                    <button key={id} type="button" onClick={() => setView(id)} title={constellation(id).name} className="hover:scale-110 transition-transform">
                      <ConstellationIcon c={constellation(id)} size={arr.length > 3 ? (i % 2 ? 76 : 64) : 84} plain />
                    </button>
                  ))
                : <ConstellationIcon c={constellation(view)} size={112} plain />}
            </div>
          ) : null}
          {mode === 'hra' ? (
            <div className="flex items-center gap-1.5 mt-2" aria-label={`Kolo ${round + 1} z ${rounds.length}`}>
              {rounds.map((_, i) => (
                <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === round ? 26 : 12, background: i < round || (i === round && roundDone) ? '#f0a12c' : i === round ? '#fff' : 'rgba(255,255,255,.3)' }} />
              ))}
              <span className="ml-2 text-xs font-bold text-[#9aa6d1]">Kolo {round + 1} z {rounds.length}</span>
            </div>
          ) : null}
        </div>

        <div className="px-5 pt-4 pb-6 flex flex-col gap-3">
          {mode === 'hra' ? (
            <>
              {roundDone ? (
                <>
                  <p className="text-lg font-bold text-[#1f8a4c]">Výborně! {r.type === 'polarka' ? 'Polárku máš.' : `Souhvězdí ${c!.name} je spojené.`}</p>
                  {isGame ? null : <p className="text-base leading-relaxed text-[#4e5871]">{doneText}</p>}
                  {isGame ? null : <p className="text-sm font-bold text-[#9aa6d1]">{round + 1 < rounds.length ? 'Za chvíli pokračuje další kolo…' : 'Za chvíli uvidíš výsledek…'}</p>}
                  {isGame ? null : <button
                    type="button"
                    onClick={() => showOnSky(r.type === 'polarka' ? 'vuz' : c!.id)}
                    className="self-start vb-btn"
                  >
                    ✨ Prohlédnout na obloze
                  </button>}
                </>
              ) : (
                <>
                  <p className="text-base leading-relaxed text-[#4e5871]">{drawTask ?? task}</p>
                </>
              )}
            </>
          ) : mode === 'vyber' ? (
            <>
              <p className="text-base leading-relaxed text-[#4e5871]">Vyber souhvězdí, která budeš spojovat podle čísel. Rychle vybereš i celé roční období.</p>
              <div className="flex flex-wrap gap-1.5">
                {(['cely-rok', 'jaro', 'leto', 'podzim', 'zima'] as Season[]).map((f) => {
                  const ids = CONSTELLATIONS.filter((x) => x.season === f).map((x) => x.id);
                  const on = ids.length === picked.length && ids.every((id) => picked.includes(id));
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPicked(ids)}
                      aria-pressed={on}
                      className={`vb-btn vb-btn-sm${on ? ' vb-btn-on' : ''}`}
                    >
                      {seasonOf(f).icon} {seasonOf(f).name}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['cely-rok', 'jaro', 'leto', 'podzim', 'zima'] as Season[]).map((sid) => [
                  <p key={`h-${sid}`} className="col-span-4 text-xs font-bold text-[#56628a] mt-2">{seasonOf(sid).icon} {sid === 'cely-rok' ? 'Po celý rok (u Polárky)' : seasonOf(sid).name}</p>,
                  ...CONSTELLATIONS.filter((cons) => cons.season === sid).map((cons) => {
                    const on = picked.includes(cons.id);
                    return <ConsTile key={cons.id} c={cons} on={on} check onClick={() => setPicked((p) => (on ? p.filter((x) => x !== cons.id) : [...p, cons.id]))} />;
                  }),
                ])}
              </div>
              {/* Tlačítko zůstává vidět dole i u dlouhého seznamu. */}
              <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-1 bg-white">
              <button
                type="button"
                disabled={picked.length === 0}
                onClick={startGame}
                className="w-full vb-btn vb-btn-primary vb-btn-lg"
              >
                {picked.length === 0 ? 'Vyber aspoň jedno souhvězdí' : `Začít hru (${picked.length}) →`}
              </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold text-[#56628a] mb-2">Roční období</p>
                <div className="flex flex-wrap gap-1.5">
                  {((allSeasons ? ['vse', ...ALL4] : modelSeasons) as SeasonFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => { setSeason(f); setView('all'); }}
                      aria-pressed={season === f}
                      className={`vb-btn vb-btn-sm${season === f ? ' vb-btn-on' : ''}`}
                    >
                      {f === 'vse' ? 'Všechna' : `${seasonOf(f).icon} ${seasonOf(f).name}`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-base leading-relaxed text-[#4e5871]">{view === 'all' ? (season === 'vse' ? ALL_TEXT : seasonOf(season).text) : constellation(view).text}</p>
              {view === 'vuz' ? (
                <div className="rounded-2xl bg-[#eef1f8] p-3">
                  <p className="text-sm font-bold text-[#0f1d4d]">Jak najít Polárku</p>
                  <p className="text-sm leading-snug text-[#4e5871] mt-1">{POLARKA_TEXT}</p>
                </div>
              ) : null}
              <div className="pt-1">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setView('all')}
                    className="col-span-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-left font-bold transition-colors"
                    style={{ background: view === 'all' ? '#fde9c6' : '#f4f6fb' }}
                  >
                    <span className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-xl" style={{ background: '#0b1236' }} aria-hidden="true">✨</span>
                    {season === 'vse' ? 'Celá obloha – všechna najednou' : `Obloha ${seasonOf(season).on} – na mapě`}
                  </button>
                  {(season === 'vse' ? (['cely-rok', ...ALL4] as Season[]) : allSeasons ? [season, 'cely-rok' as Season] : [...modelSeasons, 'cely-rok' as Season]).map((sid) => [
                    <p key={`h-${sid}`} className="col-span-4 text-xs font-bold text-[#56628a] mt-2">{seasonOf(sid).icon} {sid === 'cely-rok' ? 'Po celý rok (u Polárky)' : seasonOf(sid).name}</p>,
                    ...CONSTELLATIONS.filter((cons) => cons.season === sid).map((cons) => (
                    <ConsTile key={cons.id} c={cons} on={view === cons.id} hot={hoverId === cons.id} onHover={(h) => { if (view === 'all' && season === 'vse') setHover(h ? cons.id : null); }} onClick={() => { setHover(null); setView(cons.id); }} />
                    )),
                  ])}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {feedback ? <PrvoukaFeedbackOverlay isCorrect={feedback.isCorrect} hint={feedback.hint} info={feedback.info} onComplete={() => setFeedback(null)} /> : null}
      {finished ? (
        <GameResultScreen
          isSuccess
          onContinue={restart}
          successText="Hvězdář! ⭐"
          showContinueButton
          displayType="gameComplete"
          score={{ correct: cleanRounds, total: rounds.length }}
        />
      ) : null}
    </div>
  );
}

/** Obrázek tvaru souhvězdí (čáry a tečky). V seznamu na tmavé dlaždici, v hlavičce panelu velký bez pozadí. */
function ConstellationIcon({ c, size = 40, plain = false }: { c: Constellation; size?: number; plain?: boolean }) {
  const proj = projectScene(c.stars);
  const pts = Object.values(proj);
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const s = 30 / Math.max(maxX - minX, maxY - minY);
  const at = (id: string) => ({ x: 5 + (proj[id].x - minX) * s + (30 - (maxX - minX) * s) / 2, y: 5 + (proj[id].y - minY) * s + (30 - (maxY - minY) * s) / 2 });
  const k = plain ? 40 / size * 1.6 : 1; // v hlavičce ať čáry nejsou moc tenké
  return (
    <svg viewBox="0 0 40 40" className={`flex-shrink-0 ${plain ? '' : 'rounded-xl'}`} style={{ width: size, height: size, background: plain ? 'none' : '#0b1236', overflow: 'visible' }} aria-hidden="true">
      {c.edges.map(([a, b]) => { const p = at(a), q = at(b); return <line key={a + b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={GOLD} strokeWidth={1.2 * Math.max(1, k * 0.8)} strokeLinecap="round" />; })}
      {c.stars.map((st) => { const p = at(st.id); return <circle key={st.id} cx={p.x} cy={p.y} r={1.8 * Math.max(1, k * 0.7)} fill="#fff" />; })}
    </svg>
  );
}

/** Dlaždice souhvězdí jako dlaždice planet ve Sluneční soustavě: obrázek nahoře, jméno pod ním. */
function ConsTile({ c, on, hot = false, check = false, onClick, onHover }: { c: Constellation; on: boolean; hot?: boolean; check?: boolean; onClick: () => void; onHover?: (h: boolean) => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  // Souhvězdí pod myší na mapě: dlaždice se rozsvítí a panel ji ukáže, kdyby byla mimo.
  useEffect(() => { if (hot) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [hot]);
  return (
    <button
      ref={ref}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="relative flex flex-col items-center gap-1 rounded-2xl py-2 px-1 transition-colors min-w-0"
      style={{ background: on || hot ? '#fde9c6' : '#f4f6fb', boxShadow: check && on ? 'inset 0 0 0 2px #f0a12c' : 'none' }}
    >
      <ConstellationIcon c={c} size={52} />
      <span className="text-xs font-bold text-[#3b4a8c] text-center leading-tight min-h-[2em] flex items-center">{c.name}</span>
      {check ? (
        <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={on ? { background: '#f0a12c', color: '#2a1700' } : { background: '#fff', border: '2px solid #c9d0e4' }} aria-hidden="true">{on ? '✓' : ''}</span>
      ) : null}
    </button>
  );
}


/**
 * Postavy souhvězdí z atlasu Johanna Hevelia „Firmamentum Sobiescianum“ (1690, volné dílo, Wikimedia Commons).
 * Obrázek je zrcadlově otočený (Hevelius kreslil jako na globu zvenku) a převedený na světlou linku.
 * Dvě kotvy: pixel hvězdy v obrázku → stejná hvězda v modelu; podle nich se obrázek posune, otočí a zvětší.
 */

