import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { PrvoukaPicture } from './data/types';
import type { IllustrationLookup } from './illustrations';

/** Barvy jako v matematických minihrách (Rozřaď čísla): béžová plocha, hnědý text, pastelové krabice. */
export const PRVOUKA_COLORS = {
  PAGE_BG: '#F5E6D0',
  TEXT: '#7C3A2A',
  CARD_BG: '#FFFFFF',
  CARD_BORDER: '#D4A574',
};

export interface BoxPalette {
  front: string;
  back: string;
  border: string;
}

export const BOX_PALETTES: Record<'green' | 'orange' | 'blue' | 'pink' | 'purple' | 'yellow', BoxPalette> = {
  green: { front: '#B8E6B8', back: '#6FBF6F', border: '#4A9F4A' },
  orange: { front: '#FFD5A8', back: '#E89B5B', border: '#C17A3B' },
  blue: { front: '#A8D5FF', back: '#5B9BD5', border: '#3B7BA9' },
  pink: { front: '#FFC9D6', back: '#E8738F', border: '#C2506C' },
  purple: { front: '#D9CCFF', back: '#9C86E8', border: '#6E58C2' },
  yellow: { front: '#FFF0A8', back: '#E8C85B', border: '#B8962B' },
};

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

/**
 * Měřítko pro velké obrazovky: hry běží hlavně na interaktivní tabuli, takže vše
 * roste s oknem. Výchozí rozměry jsou navržené pro 1200 × 780; na 1920 × 1080 je to ~1,4×.
 */
export function useDesktopScale(): number {
  const compute = () => {
    if (typeof window === 'undefined') return 1;
    // Spodní mez je nízko, aby se i v nízkém okně notebooku vešlo zadání, úloha i skóre dole.
    return Math.max(0.55, Math.min(2.4, Math.min(window.innerWidth / 1100, window.innerHeight / 760)));
  };
  const [scale, setScale] = useState(compute);
  useEffect(() => {
    const onResize = () => setScale(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

function useDesktopScaleValue(): number {
  return Math.max(0.85, Math.min(2.4, Math.min(window.innerWidth / 1100, window.innerHeight / 700)));
}

/* ------------------------------------------------------------ lišta postupu */

/** Lišta pod hrou: pruh postupu, „3/10“ a tři srdíčka – stejná jako v Rozřaď čísla. */
export function PrvoukaProgress({ current, total, lives, maxLives = 3 }: { current: number; total: number; lives: number; maxLives?: number }) {
  const isMobile = useIsMobile();
  const s = useDesktopScale();
  const progress = Math.min(100, (current / Math.max(1, total)) * 100);
  return (
    <div
      className="flex items-center gap-3 sm:gap-5 rounded-full px-4 sm:px-5 py-2 sm:py-2.5"
      style={{ background: PRVOUKA_COLORS.CARD_BG, border: `2px solid ${PRVOUKA_COLORS.CARD_BORDER}` }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="rounded-full overflow-hidden" style={{ backgroundColor: '#F3E6D4', height: isMobile ? 8 : 12 * s, width: isMobile ? 120 : 190 * s }}>
          <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: PRVOUKA_COLORS.CARD_BORDER }} />
        </div>
        <div style={{ color: PRVOUKA_COLORS.TEXT, fontSize: isMobile ? 22 : 28 * s, fontWeight: 600, minWidth: isMobile ? 70 : 95 * s, textAlign: 'right' }}>
          {current}/{total}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5">
        {Array.from({ length: maxLives }, (_, index) => index + 1).map((i) => (
          <svg key={i} viewBox="0 0 24 24" style={{ width: isMobile ? 18 : 24 * s, height: isMobile ? 18 : 24 * s }} fill={i <= lives ? '#F87171' : '#E5E7EB'} className="flex-shrink-0">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- zpětná vazba */

/** Překryv SPRÁVNĚ! / ZKUS ZNOVU! – stejný jako v Rozřaď čísla, navíc krátká nápověda. */
export function PrvoukaFeedbackOverlay({ isCorrect, hint, onComplete }: { isCorrect: boolean; hint?: string; onComplete: () => void }) {
  const isMobile = useIsMobile();
  const s = isMobile ? 1 : useDesktopScaleValue();
  useEffect(() => {
    const timer = setTimeout(onComplete, isCorrect ? 1300 : hint ? 2600 : 1500);
    return () => clearTimeout(timer);
  }, [onComplete, isCorrect, hint]);
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className="text-center px-10 sm:px-12 py-6 sm:py-8 rounded-3xl"
        style={{ backgroundColor: isCorrect ? '#4CAF50' : '#FF4D6D', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <div className="text-white" style={{ fontSize: 80 * s, lineHeight: 1, marginBottom: 12 * s }}>{isCorrect ? '✓' : '✗'}</div>
        <div className="text-white" style={{ fontSize: 44 * s, fontWeight: 'bold' }}>{isCorrect ? 'SPRÁVNĚ!' : 'ZKUS ZNOVU!'}</div>
        {!isCorrect && hint ? (
          <div className="text-white mt-3" style={{ fontSize: 22 * s, fontWeight: 600, lineHeight: 1.35, maxWidth: 640 * s }}>{hint}</div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

/* --------------------------------------------------------------- krabice */

/**
 * Krabice jako v Rozřaď čísla: zadní (tmavší) díl, přední (světlejší) díl s popiskem.
 * Do ní sjede kartička se zvířetem, ovocem…
 */
export function PrvoukaBox({
  label,
  palette,
  size,
  onClick,
  isHighlighted,
  isWrong,
  labelLength,
}: {
  label: string;
  /** Délka nejdelšího slova ze všech krabic v řadě – ať mají všechny stejně velké písmo. */
  labelLength?: number;
  palette: BoxPalette;
  size: number;
  onClick?: () => void;
  isHighlighted?: boolean;
  isWrong?: boolean;
}) {
  const backHeight = size * 0.35;
  const frontHeight = size * 0.75;
  const overlap = size * 0.1;
  const borderWidth = size < 150 ? 2 : size < 200 ? 3 : 4;
  const longest = labelLength ?? Math.max(...label.split(' ').map((word) => word.length));
  const fontSize = Math.min(size * 0.2, (size * 1.5) / Math.max(longest, 4));
  return (
    <motion.div
      className="relative flex flex-col items-center cursor-pointer select-none"
      onClick={onClick}
      animate={isWrong ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0, scale: isHighlighted ? 1.05 : 1 }}
      transition={{ duration: 0.4 }}
      role="button"
      aria-label={label}
    >
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter: isHighlighted ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
        }}
      >
        <div
          className="absolute flex items-center justify-center text-center"
          style={{
            width: size,
            height: frontHeight,
            backgroundColor: palette.front,
            borderRadius: size < 200 ? '8px 8px 16px 16px' : '12px 12px 24px 24px',
            top: backHeight - overlap,
            left: 0,
            border: `${borderWidth}px solid ${palette.border}`,
            zIndex: 1,
            color: palette.border,
            fontSize,
            fontWeight: 'bold',
            lineHeight: 1.05,
            padding: 6,
          }}
        >
          {label}
        </div>
        <div
          className="absolute"
          style={{
            width: size,
            height: backHeight,
            backgroundColor: palette.back,
            borderRadius: size < 200 ? 12 : 16,
            top: 0,
            left: 0,
            border: `${borderWidth}px solid ${palette.border}`,
            zIndex: 10,
          }}
        />
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- obrázky */

/**
 * Obrázek úlohy. `size` je šířka, `height` výška (výchozí čtverec). Fotky a ilustrace
 * se vejdou celé (`contain`), aby se nic neořízlo.
 */
export function PrvoukaPictureView({ picture, illustrations, size, height }: { picture: PrvoukaPicture; illustrations: IllustrationLookup; size: number; height?: number }) {
  const boxHeight = height ?? size;
  if (picture.kind === 'photo') {
    return <img src={picture.src} alt={picture.alt} draggable={false} style={{ width: size, height: boxHeight, objectFit: 'contain', borderRadius: 10 }} />;
  }
  if (picture.kind === 'clock') {
    return <PrvoukaClock hour={picture.hour} minute={picture.minute} show24={picture.show24} size={Math.min(size, boxHeight)} />;
  }
  if (picture.kind === 'digital') {
    return <DigitalClock text={picture.text} size={Math.min(size, boxHeight * 1.3)} />;
  }
  if (picture.kind === 'sign') {
    if (picture.sign === 'semafor-cervena' || picture.sign === 'semafor-zelena') {
      return <PedestrianLight green={picture.sign === 'semafor-zelena'} size={boxHeight} />;
    }
    return <img src={`${import.meta.env.BASE_URL}prvouka/znacky/${picture.sign}.svg`} alt={picture.alt} draggable={false} style={{ width: size, height: boxHeight, objectFit: 'contain' }} />;
  }
  if (picture.kind === 'ill') return <IllustrationImage picture={picture} illustrations={illustrations} size={size} height={boxHeight} />;
  return (
    <span role="img" aria-label={picture.alt} style={{ fontSize: boxHeight * 0.7, lineHeight: 1 }}>
      {picture.emoji}
    </span>
  );
}

function IllustrationImage({ picture, illustrations, size, height }: { picture: Extract<PrvoukaPicture, { kind: 'ill' }>; illustrations: IllustrationLookup; size: number; height: number }) {
  const [attempt, setAttempt] = useState(0);
  const url = illustrations.urls(picture.id)[attempt];
  if (url) {
    return (
      <img
        key={url}
        src={url}
        alt={picture.alt}
        draggable={false}
        onError={() => setAttempt((value) => value + 1)}
        style={{ width: size, height, objectFit: 'contain' }}
      />
    );
  }
  if (!illustrations.ready) return <div style={{ width: size, height }} />;
  return (
    <span role="img" aria-label={picture.alt} style={{ fontSize: height * 0.7, lineHeight: 1 }}>
      {picture.emoji}
    </span>
  );
}

function PedestrianLight({ green, size }: { green: boolean; size: number }) {
  return (
    <svg viewBox="0 0 120 220" style={{ height: size, width: (size * 120) / 220 }} aria-hidden="true">
      <rect x="10" y="6" width="100" height="208" rx="22" fill="#26304f" />
      <circle cx="60" cy="62" r="40" fill={green ? '#4a2430' : '#ff3b4f'} />
      <circle cx="60" cy="158" r="40" fill={green ? '#2fd27a' : '#1e4a35'} />
      <g fill={green ? '#7a3d4b' : '#fff'} transform="translate(60 62)">
        <circle cx="0" cy="-22" r="6" />
        <rect x="-8" y="-14" width="16" height="22" rx="5" />
        <rect x="-7" y="6" width="5" height="20" rx="2.5" />
        <rect x="2" y="6" width="5" height="20" rx="2.5" />
      </g>
      <g fill={green ? '#fff' : '#2d6b4c'} transform="translate(60 158)">
        <circle cx="2" cy="-23" r="6" />
        <rect x="-6" y="-15" width="14" height="20" rx="5" transform="rotate(8)" />
        <rect x="-3" y="3" width="5" height="22" rx="2.5" transform="rotate(28 0 3)" />
        <rect x="0" y="3" width="5" height="22" rx="2.5" transform="rotate(-24 0 3)" />
        <rect x="-12" y="-12" width="5" height="16" rx="2.5" transform="rotate(30 -10 -12)" />
      </g>
    </svg>
  );
}

/* ----------------------------------------------------------------- hodiny */

const CLOCK_RIM = '#5cb38a';
const CLOCK_RIM_DARK = '#3e9670';
const CLOCK_NUMBERS = '#5b7fe0';
const CLOCK_HANDS = '#2c3f98';

function polar(angleDeg: number, radius: number, cx = 100, cy = 100) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/**
 * Ručičkové hodiny jako v sešitě prvouky (zelený věnec, bílý ciferník).
 * S `onChange` jdou ručičky táhnout: chytí se ta, ke které je prst nejblíž;
 * velká skáče po `step` minutách a přes dvanáctku posune i malou.
 */
export function PrvoukaClock({
  hour,
  minute,
  size,
  show24 = false,
  ghost,
  onChange,
  step = 5,
}: {
  hour: number;
  minute: number;
  size: number;
  show24?: boolean;
  ghost?: { hour: number; minute: number } | null;
  onChange?: (hour: number, minute: number) => void;
  step?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef<'hour' | 'minute' | null>(null);
  const interactive = Boolean(onChange);
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;

  const pointerPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scale = (show24 ? 240 : 200) / rect.width;
    const offset = show24 ? -20 : 0;
    const x = (event.clientX - rect.left) * scale + offset - 100;
    const y = (event.clientY - rect.top) * scale + offset - 100;
    const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    return { x, y, angle: (angle + 360) % 360 };
  };

  const apply = (hand: 'hour' | 'minute', angle: number) => {
    if (!onChange) return;
    if (hand === 'minute') {
      let next = Math.round(angle / 6 / step) * step;
      if (next >= 60) next = 0;
      let nextHour = hour;
      if (minute >= 45 && next < 15) nextHour = (hour + 1) % 12;
      else if (minute < 15 && next >= 45) nextHour = (hour + 11) % 12;
      if (next !== minute || nextHour !== hour) onChange(nextHour, next);
      return;
    }
    const nextHour = ((Math.round(angle / 30 - minute / 60) % 12) + 12) % 12;
    if (nextHour !== hour % 12) onChange(nextHour, minute);
  };

  const distanceToHand = (point: { x: number; y: number }, angle: number, length: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const tipX = Math.cos(rad) * length;
    const tipY = Math.sin(rad) * length;
    const t = Math.max(0, Math.min(1, (point.x * tipX + point.y * tipY) / (length * length)));
    return Math.hypot(point.x - tipX * t, point.y - tipY * t);
  };

  const hand = (angle: number, length: number, width: number, color: string, opacity = 1) => {
    const tip = polar(angle, length);
    const tail = polar(angle + 180, 8);
    return <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={show24 ? '-20 -20 240 240' : '0 0 200 200'}
      style={{ width: size, height: size, touchAction: interactive ? 'none' : undefined, cursor: interactive ? 'grab' : undefined, userSelect: 'none' }}
      role="img"
      aria-label={`Hodiny ukazují ${hour}:${String(minute).padStart(2, '0')}`}
      onPointerDown={(event) => {
        if (!interactive) return;
        const point = pointerPoint(event);
        if (!point) return;
        const pick: 'hour' | 'minute' = distanceToHand(point, hourAngle, 40) - 6 <= distanceToHand(point, minuteAngle, 64) ? 'hour' : 'minute';
        dragging.current = pick;
        event.currentTarget.setPointerCapture(event.pointerId);
        apply(pick, point.angle);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        const point = pointerPoint(event);
        if (point) apply(dragging.current, point.angle);
      }}
      onPointerUp={() => {
        dragging.current = null;
      }}
      onPointerCancel={() => {
        dragging.current = null;
      }}
    >
      {show24
        ? Array.from({ length: 12 }, (_, index) => {
          const p = polar((index + 1) * 30, 110);
          return (
            <text key={index} x={p.x} y={p.y} fill="#4e6ff0" fontSize="13" fontWeight="600" textAnchor="middle" dominantBaseline="central">
              {index + 13}
            </text>
          );
        })
        : null}
      <circle cx="100" cy="100" r="96" fill={CLOCK_RIM_DARK} />
      <circle cx="100" cy="100" r="92" fill={CLOCK_RIM} />
      <circle cx="100" cy="100" r="80" fill="#fff" stroke="#cfd6e6" strokeWidth="3" />
      {Array.from({ length: 60 }, (_, index) => {
        const major = index % 5 === 0;
        const a = polar(index * 6, 77);
        const b = polar(index * 6, major ? 69 : 73);
        return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={CLOCK_NUMBERS} strokeWidth={major ? 2.4 : 1.2} strokeLinecap="round" opacity={major ? 0.9 : 0.55} />;
      })}
      {Array.from({ length: 12 }, (_, index) => {
        const p = polar((index + 1) * 30, 57);
        return (
          <text key={index} x={p.x} y={p.y} fill={CLOCK_NUMBERS} fontSize="15" fontWeight="600" textAnchor="middle" dominantBaseline="central">
            {index + 1}
          </text>
        );
      })}
      {ghost ? (
        <g>
          {hand(((ghost.hour % 12) + ghost.minute / 60) * 30, 40, 9, '#2fbf71', 0.45)}
          {hand(ghost.minute * 6, 62, 6, '#2fbf71', 0.45)}
        </g>
      ) : null}
      {hand(hourAngle, 40, 9, CLOCK_HANDS)}
      {hand(minuteAngle, 64, 5.5, CLOCK_HANDS)}
      <circle cx="100" cy="100" r="7" fill={CLOCK_RIM} stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function DigitalClock({ text, size }: { text: string; size: number }) {
  return (
    <div
      className="inline-flex items-center justify-center"
      style={{ borderRadius: size * 0.1, background: '#24282c', boxShadow: 'inset 0 0 0 5px #3a3f45, 0 8px 18px rgba(0,0,0,0.18)', padding: `${size * 0.06}px ${size * 0.12}px` }}
      aria-label={`Digitální hodiny ${text}`}
    >
      <span style={{ color: '#5df08a', fontFamily: "'Courier New', monospace", fontSize: size * 0.32, fontWeight: 700, letterSpacing: '0.04em', textShadow: '0 0 12px rgba(93,240,138,0.55)' }}>{text}</span>
    </div>
  );
}
