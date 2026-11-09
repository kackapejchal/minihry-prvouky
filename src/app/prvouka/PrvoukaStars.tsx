import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameResultScreen } from '../components/GameResultScreen';
import { rng, prefersReducedMotion } from './space-engine';
import { CONSTELLATIONS, POLARKA_TEXT, constellation, projectScene, projectSky, sceneStars, type Constellation, type SceneId, type SkyStar } from './stars-data';

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
type Mode = 'hra' | 'prohlizet';
type Round = { type: 'connect'; c: Constellation['id'] } | { type: 'polarka' };
const ROUNDS: Round[] = [{ type: 'connect', c: 'vuz' }, { type: 'polarka' }, { type: 'connect', c: 'kasiopeja' }, { type: 'connect', c: 'orion' }];
const sceneOf = (r: Round): Constellation['id'] => (r.type === 'polarka' ? 'vuz' : r.c);
const GOLD = '#ffd98a';

interface Placed { id: string; name: string; x: number; y: number; r: number; color: string; target: boolean }

/** Rozmístění výřezu na plátno: hvězdy souhvězdí + rozptýlené hvězdy, na které jde taky klepnout. */
function layoutScene(sceneId: SceneId, w: number, h: number, withPolarka: boolean): Placed[] {
  const stars = sceneStars(sceneId, withPolarka);
  const all = sceneId === 'all';
  const proj = all ? projectSky(stars) : projectScene(stars);
  const xs = Object.values(proj).map((p) => p.x), ys = Object.values(proj).map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = w * (all ? 0.08 : 0.14), padTop = h * (all ? 0.1 : 0.14), padBottom = h * (all ? 0.08 : 0.12);
  const scale = Math.min((w - padX * 2) / Math.max(1e-6, maxX - minX), (h - padTop - padBottom) / Math.max(1e-6, maxY - minY));
  const ox = (w - (maxX - minX) * scale) / 2 - minX * scale;
  const oy = padTop + (h - padTop - padBottom - (maxY - minY) * scale) / 2 - minY * scale;
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
  return placed;
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

const ALL_TEXT = 'Všechna souhvězdí na jedné mapě. Uprostřed je Polárka – kolem ní se celá obloha během noci pomalu otáčí. Najednou je ale nikdy neuvidíme: některá souhvězdí jsou vidět v létě, jiná v zimě.';

const FAINT = (() => { const r = rng(5); return Array.from({ length: 260 }, () => ({ x: r(), y: r(), s: 0.4 + r() * 1.1, a: 0.2 + r() * 0.5, tw: r() * 6.28 })); })();

export function PrvoukaStars({ settings }: { settings?: Record<string, any> }) {
  const still = useMemo(prefersReducedMotion, []);
  const [mode, setMode] = useState<Mode>(settings?.mode === 'prohlizet' ? 'prohlizet' : 'hra');
  const [view, setView] = useState<SceneId>('vuz');
  // Hra
  const [round, setRound] = useState(0);
  // Spojovačka podle čísel: kolik hvězd z pořadí už dítě spojilo.
  const [step, setStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [cleanRounds, setCleanRounds] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const flash = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [box, setBox] = useState({ w: 800, h: 600 });

  const sceneId: SceneId = mode === 'prohlizet' ? view : sceneOf(ROUNDS[round]);
  // Ve hře je Polárka jen v kole „Najdi Polárku“ – v prvním kole je vůz přes celou oblohu.
  const withPolarka = mode === 'prohlizet' ? view === 'vuz' || view === 'all' : ROUNDS[round].type === 'polarka';
  const placed = useMemo(() => layoutScene(sceneId, box.w, box.h, withPolarka), [sceneId, box.w, box.h, withPolarka]);
  const byId = useMemo(() => Object.fromEntries(placed.map((p) => [p.id, p])), [placed]);
  const r = ROUNDS[round];
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
  const restart = () => { setCleanRounds(0); setFinished(false); resetRound(0); };

  // Kreslení: každé snímek (třpyt hvězd, blikání hvězdy, kde se začíná).
  const stateRef = useRef({ mode, placed, byId, step, round, roundDone, view, mistakes });
  stateRef.current = { mode, placed, byId, step, round, roundDone, view, mistakes };
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
    const line = (a: Placed, b: Placed, alpha = 0.9) => {
      ctx.strokeStyle = `rgba(255,217,138,${alpha})`; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
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

    if (st.mode === 'prohlizet') {
      const all = st.view === 'all';
      const list = all ? CONSTELLATIONS : [constellation(st.view as Constellation['id'])];
      for (const cons of list) for (const [a, b] of cons.edges) line(st.byId[a], st.byId[b], all ? 0.75 : 0.9);
      if (st.view === 'vuz') polarkaGuide(true);
      for (const p of st.placed) drawStar(ctx, p, p.id === 'polarka' ? 1.5 : 1);
      for (const cons of list) {
        const ts = cons.stars.map((s) => st.byId[s.id]);
        const top = Math.min(...ts.map((p) => p.y)), cx = ts.reduce((a, p) => a + p.x, 0) / ts.length;
        label(ctx, cons.name, cx, Math.max(fs + 6, top - (all ? 14 : 26)), GOLD, all ? fs - 1 : fs + 4);
        if (!all) for (const id of cons.named ?? []) { if (id === 'polarka') continue; const p = st.byId[id]; label(ctx, p.name, p.x, p.y + p.r + fs + 6, '#dfe6ff', fs - 1); }
      }
      if (st.view === 'vuz' || st.view === 'maly-vuz' || all) { const p = st.byId.polarka; label(ctx, st.view === 'vuz' ? 'Polárka – sever' : 'Polárka', p.x, p.y - p.r - 14, '#7fd3ff', all ? fs - 1 : fs); }
      return;
    }

    const rr = ROUNDS[st.round];
    if (rr.type === 'polarka' || (rr.type === 'connect' && rr.c === 'vuz' && st.roundDone)) {
      for (const [a, b] of constellation('vuz').edges) line(st.byId[a], st.byId[b], rr.type === 'polarka' ? 0.6 : 0.9);
    }
    if (rr.type === 'connect') {
      const ord = constellation(rr.c).order!;
      for (let i = 1; i < st.step; i++) line(st.byId[ord[i - 1]], st.byId[ord[i]]);
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
      const ord = constellation(rr.c).order!;
      const nums: Record<string, number[]> = {};
      ord.forEach((id, i) => { (nums[id] ??= []).push(i); });
      const br = Math.max(11, fs * 0.62);
      for (const [id, list] of Object.entries(nums)) {
        const p = st.byId[id];
        list.forEach((i, k) => {
          const bx = p.x + p.r + br + 4 + k * (br * 2 + 4), by = p.y - p.r - br - 2;
          const done = i < st.step, isNext = i === st.step;
          ctx.fillStyle = isNext ? '#f0a12c' : done ? 'rgba(255,217,138,.25)' : 'rgba(255,255,255,.92)';
          ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.283); ctx.fill();
          ctx.font = `700 ${Math.round(br * 1.15)}px VisbyRound, system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = isNext ? '#2a1700' : done ? 'rgba(255,217,138,.8)' : '#0f1d4d';
          ctx.fillText(String(i + 1), bx, by + 1);
          ctx.textBaseline = 'alphabetic';
        });
      }
    }
    // Další hvězda, na kterou se má klepnout: pulzující kroužek.
    const pulseAt = rr.type === 'connect' && !st.roundDone ? st.byId[constellation(rr.c).order![st.step]] : null;
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
    if (mode !== 'hra' || roundDone) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let hit: Placed | null = null, best = 30;
    for (const p of placed) { const d = Math.hypot(p.x - x, p.y - y); if (d < best) { best = d; hit = p; } }
    if (!hit) return;
    const now = performance.now();
    if (r.type === 'polarka') {
      const ok = hit.id === 'polarka';
      flash.current = { x: hit.x, y: hit.y, t: now, ok };
      if (ok) { setRoundDone(true); if (mistakes === 0) setCleanRounds((n) => n + 1); } else setMistakes((m) => m + 1);
      return;
    }
    const ord = c!.order!;
    const ok = hit.id === ord[step];
    flash.current = { x: hit.x, y: hit.y, t: now, ok };
    if (!ok) { setMistakes((m) => m + 1); return; }
    setStep(step + 1);
    if (step + 1 === ord.length) { setRoundDone(true); if (mistakes === 0) setCleanRounds((n) => n + 1); }
  };

  const next = () => { if (round + 1 < ROUNDS.length) resetRound(round + 1); else setFinished(true); };

  const task = r.type === 'polarka'
    ? 'Najdi Polárku. Dvě modře označené hvězdy vozu ukazují k ní – jejich vzdálenost prodluž asi pětkrát a klepni na hvězdu, kterou tam najdeš.'
    : step === 0
      ? `Spoj hvězdy souhvězdí ${c!.name} podle čísel. Začni hvězdou s číslem 1.`
      : `Teď klepni na hvězdu s číslem ${step + 1}.`;
  const doneText = r.type === 'polarka' ? POLARKA_TEXT : c!.text;

  return (
    <div className={`w-full min-h-[100svh] lg:h-[100svh] bg-[#eef1f8] p-3 md:p-5 ${settings ? NAV_SPACE : ''} grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,29vw)] lg:grid-rows-[minmax(0,1fr)]`}>
      <div className={`relative rounded-3xl overflow-hidden bg-[#05081a] min-h-[60svh] lg:min-h-0 ${settings ? NAV_LEFT : ''}`}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none', cursor: mode === 'hra' && !roundDone ? 'pointer' : 'default' }} onPointerDown={onTap} aria-label="Noční obloha se souhvězdím" />
      </div>

      <aside className="rounded-3xl bg-white text-[#0f1d4d] flex flex-col min-w-0 overflow-hidden lg:overflow-y-auto">
        <div className="relative flex-shrink-0 px-5 pt-4 pb-5 text-white" style={{ background: 'linear-gradient(180deg, #121c55 0%, #0b1236 100%)' }}>
          {/* Hra / Prohlížet – spojené tlačítko jako u ostatních modelů. */}
          <div className="inline-flex rounded-full p-1" style={{ background: 'rgba(255,255,255,.12)' }}>
            {(['hra', 'prohlizet'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className="h-9 px-4 rounded-full text-sm font-bold transition-colors"
                style={mode === m ? { background: '#f0a12c', color: '#2a1700' } : { color: '#e7ecff' }}
              >
                {m === 'hra' ? 'Hra' : 'Prohlížet'}
              </button>
            ))}
          </div>
          <h2 className="text-3xl font-bold mt-3">{mode === 'prohlizet' ? (view === 'all' ? 'Celá obloha' : constellation(view).name) : r.type === 'polarka' ? 'Polárka' : c!.name}</h2>
          {mode === 'hra' ? (
            <div className="flex items-center gap-1.5 mt-2" aria-label={`Kolo ${round + 1} z ${ROUNDS.length}`}>
              {ROUNDS.map((_, i) => (
                <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === round ? 26 : 12, background: i < round || (i === round && roundDone) ? '#f0a12c' : i === round ? '#fff' : 'rgba(255,255,255,.3)' }} />
              ))}
              <span className="ml-2 text-xs font-bold text-[#9aa6d1]">Kolo {round + 1} z {ROUNDS.length}</span>
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
                  <button
                    type="button"
                    onClick={next}
                    className="self-start mt-1 h-11 px-5 rounded-full bg-white border-2 border-[#4e5871] shadow-[0_3px_0_#4e5871] font-bold text-[#0f1d4d] active:translate-y-[2px] active:shadow-[0_1px_0_#4e5871] transition"
                  >
                    {round + 1 < ROUNDS.length ? 'Další kolo →' : 'Hotovo'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-base leading-relaxed text-[#4e5871]">{task}</p>
                  {mistakes > 0 ? <p className="text-sm font-bold text-[#c2410c]">Tahle to nebyla, zkus jinou.</p> : null}
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-base leading-relaxed text-[#4e5871]">{view === 'all' ? ALL_TEXT : constellation(view).text}</p>
              {view === 'vuz' ? (
                <div className="rounded-2xl bg-[#eef1f8] p-3">
                  <p className="text-sm font-bold text-[#0f1d4d]">Jak najít Polárku</p>
                  <p className="text-sm leading-snug text-[#4e5871] mt-1">{POLARKA_TEXT}</p>
                </div>
              ) : null}
              <div className="pt-1">
                <p className="text-sm font-bold text-[#56628a] mb-2">Souhvězdí</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setView('all')}
                    className="col-span-2 flex items-center gap-3 rounded-2xl px-3 py-2 text-left font-bold transition-colors"
                    style={{ background: view === 'all' ? '#fde9c6' : '#f4f6fb' }}
                  >
                    <span className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-xl" style={{ background: '#0b1236' }} aria-hidden="true">✨</span>
                    Celá obloha – všechna najednou
                  </button>
                  {CONSTELLATIONS.map((cons) => (
                    <button
                      key={cons.id}
                      type="button"
                      onClick={() => setView(cons.id)}
                      className="flex items-center gap-2 rounded-2xl px-2 py-2 text-left text-sm font-bold transition-colors min-w-0"
                      style={{ background: view === cons.id ? '#fde9c6' : '#f4f6fb' }}
                    >
                      <ConstellationIcon c={cons} />
                      <span className="min-w-0 leading-tight">{cons.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {finished ? (
        <GameResultScreen
          isSuccess
          onContinue={restart}
          successText="Hvězdář! ⭐"
          showContinueButton
          displayType="gameComplete"
          score={{ correct: cleanRounds, total: ROUNDS.length }}
        />
      ) : null}
    </div>
  );
}

/** Malý obrázek tvaru souhvězdí do seznamu (čáry a tečky). */
function ConstellationIcon({ c }: { c: Constellation }) {
  const proj = projectScene(c.stars);
  const pts = Object.values(proj);
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const s = 30 / Math.max(maxX - minX, maxY - minY);
  const at = (id: string) => ({ x: 5 + (proj[id].x - minX) * s + (30 - (maxX - minX) * s) / 2, y: 5 + (proj[id].y - minY) * s + (30 - (maxY - minY) * s) / 2 });
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10 flex-shrink-0 rounded-xl" style={{ background: '#0b1236' }} aria-hidden="true">
      {c.edges.map(([a, b]) => { const p = at(a), q = at(b); return <line key={a + b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={GOLD} strokeWidth={1.2} />; })}
      {c.stars.map((st) => { const p = at(st.id); return <circle key={st.id} cx={p.x} cy={p.y} r={1.8} fill="#fff" />; })}
    </svg>
  );
}

