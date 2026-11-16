import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Přepínač „jedna z několika“ jako v Početníčku: vybraná pilulka při změně plynule odjede
 * na novou volbu (posouvá se jeden podklad, tlačítka zůstávají průhledná).
 */
export function SlidingSegmented<T extends string | number>({
  label,
  value,
  onChange,
  options,
  trackStyle,
  pillColor,
  textOn,
  textOff,
  className = '',
  buttonClassName = '',
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
  trackStyle?: React.CSSProperties;
  pillColor: string;
  textOn: string;
  textOff: string;
  className?: string;
  buttonClassName?: string;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const btns = useRef<Array<HTMLButtonElement | null>>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = useState(false);
  const idx = options.findIndex((o) => String(o.value) === String(value));

  useLayoutEffect(() => {
    const measure = () => {
      const b = btns.current[idx];
      setPill(b ? { left: b.offsetLeft, width: b.offsetWidth } : null);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' && wrap.current ? new ResizeObserver(measure) : null;
    if (ro && wrap.current) ro.observe(wrap.current);
    return () => ro?.disconnect();
  }, [idx, options.length]);
  // První vykreslení bez animace, ať pilulka „nepřijede“ odněkud zleva.
  useLayoutEffect(() => { const t = window.setTimeout(() => setAnimate(true), 50); return () => window.clearTimeout(t); }, []);

  return (
    <div ref={wrap} className={`relative inline-flex max-w-full rounded-full p-1 ${className}`} style={trackStyle} role="radiogroup" aria-label={label}>
      {pill ? (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-full pointer-events-none"
          style={{
            left: pill.left,
            width: pill.width,
            background: pillColor,
            transition: animate ? 'left .28s cubic-bezier(.3,.7,.3,1), width .28s cubic-bezier(.3,.7,.3,1), background-color .2s' : 'none',
          }}
        />
      ) : null}
      {options.map((option, i) => {
        const active = i === idx;
        return (
          <button
            key={String(option.value)}
            ref={(el) => { btns.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative z-[1] rounded-full whitespace-nowrap font-bold transition-colors duration-200 ${buttonClassName}`}
            style={{ color: active ? textOn : textOff, background: 'transparent' }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
