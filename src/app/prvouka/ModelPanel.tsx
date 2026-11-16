import React from 'react';

/**
 * Telefon a tablet: panel (planety, fáze, popis) je schovaný v menu v pravém horním rohu modelu,
 * model má celou obrazovku. Na počítači je panel vedle modelu jako dřív.
 */
export function PanelToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? 'Zavřít menu' : label}
      className={`lg:hidden absolute top-3 right-3 z-[70] vb-btn vb-btn-dark${open ? ' vb-btn-on' : ''}`}
    >
      {open ? (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      )}
      <span className="hidden sm:inline">{open ? 'Zavřít' : label}</span>
    </button>
  );
}
/** Třídy panelu: na počítači vedle modelu, na telefonu/tabletu vyjede přes model pod tlačítkem menu. */
export const panelClass = (open: boolean) => `rounded-3xl bg-white text-[#0f1d4d] flex flex-col min-w-0 overflow-hidden lg:overflow-y-auto ${open ? 'max-lg:fixed max-lg:left-3 max-lg:right-3 max-lg:top-[5.25rem] max-lg:bottom-3 max-lg:z-[60] max-lg:overflow-y-auto max-lg:shadow-2xl' : 'max-lg:hidden'}`;
/** Model na telefonu/tabletu přes celou výšku obrazovky (panel je v menu). */
export const MODEL_H = 'h-[calc(100svh-1.5rem)] md:h-[calc(100svh-2.5rem)] lg:h-auto lg:min-h-0';
