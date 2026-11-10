import React, { useEffect, useMemo, useRef, useState } from 'react';
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
const NAV_SPACE = 'pb-20 lg:pb-5';
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

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number) {
  ctx.font = `700 ${size}px VisbyRound, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(6,10,28,.9)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

const ALL_TEXT = 'Všechna souhvězdí na jedné mapě. Uprostřed je Polárka – kolem ní se celá obloha během noci pomalu otáčí. Najednou je ale nikdy neuvidíme: některá souhvězdí jsou vidět v létě, jiná v zimě. Vyber roční období a mapa se otočí jako otočná mapa hvězdné oblohy.';
const seasonOf = (id: Season) => SEASONS.find((s) => s.id === id)!;
/** Natočení mapy: večerní obloha daného období dole (k jižnímu obzoru). */
const seasonRotation = (f: SeasonFilter) => (f === 'vse' || f === 'cely-rok' ? 0 : Math.PI / 2 - (seasonOf(f).ra / 12) * Math.PI);

const FAINT = (() => { const r = rng(5); return Array.from({ length: 260 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 1.1, a: 0.2 + r() * 0.5, tw: r() * 6.28 })); })();

/** model = Model hvězdné oblohy (prohlížení + zkratka do hry), hra = samostatná hra Souhvězdí (výběr a spojovačka). */
export function PrvoukaStars({ settings, variant = 'model' }: { settings?: Record<string, any>; variant?: 'model' | 'hra' }) {
  const isGame = variant === 'hra';
  const startSeason: SeasonFilter = ['cely-rok', 'jaro', 'leto', 'podzim', 'zima'].includes(settings?.season) ? settings!.season : 'vse';
  const pickFor = (f: SeasonFilter) => (f === 'vse' ? DEFAULT_PICK : CONSTELLATIONS.filter((x) => x.season === f).map((x) => x.id));
  const still = useMemo(prefersReducedMotion, []);
  // Hra bere souhvězdí z nastavení hry (zaškrtávací seznam) a začíná rovnou spojovačkou.
  // Z vybraných ročních období se souhvězdí losují náhodně (při každé nové hře znovu).
  const gameSeasons: string[] = Array.isArray(settings?.seasons) && settings!.seasons.length ? settings!.seasons : ['cely-rok'];
  const gameCount = Number(settings?.rounds) || 4;
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
  // Hra
  const [round, setRound] = useState(0);
  // Spojovačka podle čísel: kolik hvězd z pořadí už dítě spojilo.
  const [step, setStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [cleanRounds, setCleanRounds] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; hint?: string } | null>(null);
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
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resetRound = (i: number) => {
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
        const ease = (cur: number, target: number) => (still || Math.abs(target - cur) < 1e-3 ? target : cur + (target - cur) * k);
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
        pl = turned.map((p) => ({ ...p, x: w / 2 + (p.x - z.x) * z.z, y: h / 2 + (p.y - z.y) * z.z }));
        by = Object.fromEntries(pl.map((p) => [p.id, p]));
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
      for (const cons of list) {
        const l = lvl(cons);
        for (const [a, b] of cons.edges) {
          const pick = all && !vse && l === 2;
          if (vse) { ctx.strokeStyle = 'rgba(255,217,138,.62)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(by[a].x, by[a].y); ctx.lineTo(by[b].x, by[b].y); ctx.stroke(); }
          else if (all) { if (l === 0) continue; ctx.strokeStyle = l === 2 ? 'rgba(255,217,138,.95)' : 'rgba(255,217,138,.22)'; ctx.lineWidth = l === 2 ? 2.4 : 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(by[a].x, by[a].y); ctx.lineTo(by[b].x, by[b].y); ctx.stroke(); }
          else line(by[a], by[b], 0.9);
        }
      }
      if (st.view === 'vuz') polarkaGuide(true);
      for (const p of pl) { const l = starLvl[p.id] ?? 2; ctx.globalAlpha = l === 2 ? 1 : l === 1 ? 0.4 : all && !vse ? 0 : 0.2; drawStar(ctx, vse ? { ...p, r: p.r * 0.8 } : p, p.id === 'polarka' ? 1.5 : vse ? 0.6 : 1); }
      ctx.globalAlpha = 1;
      // Popisky bez překrývání: každý dostane místo, kde nezakryje jiný popisek.
      const boxes: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
      const overlap = (bx: { x0: number; x1: number; y0: number; y1: number }) => boxes.reduce((acc, o) => acc + Math.max(0, Math.min(bx.x1, o.x1) - Math.max(bx.x0, o.x0)) * Math.max(0, Math.min(bx.y1, o.y1) - Math.max(bx.y0, o.y0)), 0);
      // Popisky ať nezakrývají ani hvězdy souhvězdí (a body uprostřed čar).
      if (all) for (const cons of list) {
        if (lvl(cons) === 0 && !vse) continue;
        for (const st2 of cons.stars) { const p = by[st2.id]; boxes.push({ x0: p.x - 7, x1: p.x + 7, y0: p.y - 7, y1: p.y + 7 }); }
        for (const [a, b] of cons.edges) for (const t of [0.25, 0.5, 0.75]) { const x = by[a].x + (by[b].x - by[a].x) * t, y = by[a].y + (by[b].y - by[a].y) * t; boxes.push({ x0: x - 4, x1: x + 4, y0: y - 4, y1: y + 4 }); }
      }
      const place = (text: string, size: number, spots: Array<[number, number]>, color: string, force = true) => {
        const half = text.length * size * 0.29 + 3;
        let best: { x: number; y: number; o: number } | null = null;
        for (const [x, y] of spots) {
          const cx = Math.min(w - half - 4, Math.max(half + 4, x)), cy = Math.max(size + 4, Math.min(h - 6, y));
          const o = overlap({ x0: cx - half, x1: cx + half, y0: cy - size, y1: cy + 3 });
          if (!best || o < best.o) best = { x: cx, y: cy, o };
          if (o === 0) break;
        }
        if (!best || (!force && best.o > 0)) return;
        boxes.push({ x0: best.x - half, x1: best.x + half, y0: best.y - size, y1: best.y + 3 });
        label(ctx, text, best.x, best.y, color, size);
      };
      if (st.view === 'vuz' || st.view === 'maly-vuz' || all) {
        const p = by.polarka, size = all ? fs - 3 : fs;
        place(st.view === 'vuz' ? 'Polárka – sever' : 'Polárka', size, all ? [[p.x, p.y + p.r + size + 6], [p.x, p.y - p.r - 10]] : [[p.x, p.y - p.r - 14]], '#7fd3ff');
      }
      for (const cons of list) {
        const l = lvl(cons);
        if (l === 0) continue;
        const ts = cons.stars.map((s) => by[s.id]);
        const x0 = Math.min(...ts.map((p) => p.x)), x1 = Math.max(...ts.map((p) => p.x));
        const top = Math.min(...ts.map((p) => p.y)), bottom = Math.max(...ts.map((p) => p.y));
        const cx = (x0 + x1) / 2, cy = (top + bottom) / 2;
        if (all && !vse && l === 1 && cons.id !== 'vuz') continue;
        const size = all ? (vse ? Math.max(11, fs - 4) : l === 2 ? fs : Math.max(11, fs - 4)) : fs + 4;
        const half = cons.name.length * size * 0.29;
        const spots: Array<[number, number]> = all
          ? [[cx, top - 10], [cx, bottom + size + 8], [x1 + half + 10, cy + size / 3], [x0 - half - 10, cy + size / 3], [cx, cy + size / 3]]
          : [[cx, Math.max(fs + 6, top - 26)]];
        place(cons.name, size, spots, l === 2 ? GOLD : 'rgba(255,217,138,.45)');
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
      for (let i = 1; i < st.step; i++) if (!brk.has(i)) line(st.byId[ord[i - 1]], st.byId[ord[i]]);
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
      const br = Math.max(11, fs * 0.62);
      for (const [id, list] of Object.entries(nums)) {
        const p = st.byId[id];
        // Číslo hvězdy, která už je spojená, zmizí – zůstanou jen ta, na která se ještě klepe.
        list.filter((i) => i >= st.step).forEach((i, k) => {
          const bx = p.x + p.r + br + 4 + k * (br * 2 + 4), by = p.y - p.r - br - 2;
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

  const onTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
      if (ok) { setRoundDone(true); setFeedback({ isCorrect: true }); if (mistakes === 0) setCleanRounds((n) => n + 1); }
      else { setMistakes((m) => m + 1); setFeedback({ isCorrect: false, hint: 'Prodluž čáru od dvou modře označených hvězd asi pětkrát.' }); }
      return;
    }
    const ord = stepsOf(c!.id);
    const ok = hit.id === ord[step];
    flash.current = { x: hit.x, y: hit.y, t: now, ok };
    if (!ok) { setMistakes((m) => m + 1); setFeedback({ isCorrect: false, hint: `Hledej hvězdu s číslem ${step + 1}.` }); return; }
    setStep(step + 1);
    if (step + 1 === ord.length) { setRoundDone(true); setFeedback({ isCorrect: true }); if (mistakes === 0) setCleanRounds((n) => n + 1); }
  };

  const next = () => { if (round + 1 < rounds.length) resetRound(round + 1); else setFinished(true); };
  // Po správně spojeném souhvězdí (a okně SPRÁVNĚ!) se samo přejde na další kolo – chvíli zůstane vidět hotový tvar a text.
  useEffect(() => {
    if (mode !== 'hra' || !roundDone || feedback || finished) return;
    const t = setTimeout(next, 3500);
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
  const doneText = r.type === 'polarka' ? POLARKA_TEXT : c!.text;

  return (
    <div className={`w-full min-h-[100svh] lg:h-[100svh] bg-[#eef1f8] p-3 md:p-5 ${settings ? NAV_SPACE : ''} grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,29vw)] lg:grid-rows-[minmax(0,1fr)]`}>
      <div className={`relative rounded-3xl overflow-hidden bg-[#05081a] min-h-[60svh] lg:min-h-0 ${settings ? NAV_LEFT : ''}`}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none', cursor: mode === 'hra' && !roundDone ? 'pointer' : 'default' }} onPointerDown={onTap} aria-label="Noční obloha se souhvězdím" />
      </div>

      <aside className="rounded-3xl bg-white text-[#0f1d4d] flex flex-col min-w-0 overflow-hidden lg:overflow-y-auto">
        <div className="relative flex-shrink-0 px-5 pt-5 pb-5 text-white" style={{ background: 'linear-gradient(180deg, #121c55 0%, #0b1236 100%)' }}>
          {/* Ve hře a ve výběru je „zpět“ nahoře, stejně jako u Závodu planet ve Sluneční soustavě. */}
          {!isGame && mode !== 'prohlizet' ? (
            <div className="flex">
              <button
                type="button"
                onClick={() => setMode(isGame ? 'vyber' : 'prohlizet')}
                className="inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full bg-white text-[#0f1d4d] text-sm font-bold hover:bg-[#eef1f8] transition-colors"
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
                  <p className="text-base leading-relaxed text-[#4e5871]">{doneText}</p>
                  <p className="text-sm font-bold text-[#9aa6d1]">{round + 1 < rounds.length ? 'Za chvíli pokračuje další kolo…' : 'Za chvíli uvidíš výsledek…'}</p>
                  {isGame ? null : <button
                    type="button"
                    onClick={() => showOnSky(r.type === 'polarka' ? 'vuz' : c!.id)}
                    className="self-start h-11 px-5 rounded-full bg-[#eef1f8] hover:bg-[#e2e7f3] font-bold text-[#4e5871] transition-colors"
                  >
                    ✨ Prohlédnout na obloze
                  </button>}
                </>
              ) : (
                <>
                  <p className="text-base leading-relaxed text-[#4e5871]">{task}</p>
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
                      className="h-9 px-3 rounded-full text-sm font-bold transition-colors"
                      style={on ? { background: '#f0a12c', color: '#2a1700' } : { background: '#f4f6fb', color: '#0f1d4d' }}
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
                className="w-full h-12 rounded-full font-bold text-[#2a1700] transition disabled:opacity-40"
                style={{ background: '#f0a12c', boxShadow: '0 3px 0 #b8741a' }}
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
                  {(['vse', 'jaro', 'leto', 'podzim', 'zima'] as SeasonFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => { setSeason(f); setView('all'); }}
                      aria-pressed={season === f}
                      className="h-9 px-3 rounded-full text-sm font-bold transition-colors"
                      style={season === f ? { background: '#f0a12c', color: '#2a1700' } : { background: '#f4f6fb', color: '#0f1d4d' }}
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
                  {(season === 'vse' ? (['cely-rok', 'jaro', 'leto', 'podzim', 'zima'] as Season[]) : [season, 'cely-rok' as Season]).map((sid) => [
                    <p key={`h-${sid}`} className="col-span-4 text-xs font-bold text-[#56628a] mt-2">{seasonOf(sid).icon} {sid === 'cely-rok' ? 'Po celý rok (u Polárky)' : seasonOf(sid).name}</p>,
                    ...CONSTELLATIONS.filter((cons) => cons.season === sid).map((cons) => (
                    <ConsTile key={cons.id} c={cons} on={view === cons.id} onClick={() => setView(cons.id)} />
                    )),
                  ])}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {feedback ? <PrvoukaFeedbackOverlay isCorrect={feedback.isCorrect} hint={feedback.hint} onComplete={() => setFeedback(null)} /> : null}
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
function ConsTile({ c, on, check = false, onClick }: { c: Constellation; on: boolean; check?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="relative flex flex-col items-center gap-1 rounded-2xl py-2 px-1 transition-colors min-w-0"
      style={{ background: on ? '#fde9c6' : '#f4f6fb', boxShadow: check && on ? 'inset 0 0 0 2px #f0a12c' : 'none' }}
    >
      <ConstellationIcon c={c} size={52} />
      <span className="text-xs font-bold text-[#3b4a8c] text-center leading-tight min-h-[2em] flex items-center">{c.name}</span>
      {check ? (
        <span className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold" style={on ? { background: '#f0a12c', color: '#2a1700' } : { background: '#fff', border: '2px solid #c9d0e4' }} aria-hidden="true">{on ? '✓' : ''}</span>
      ) : null}
    </button>
  );
}
