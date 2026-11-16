import React, { useMemo } from 'react';
import type { PrvoukaGame, PrvoukaGrade, PrvoukaPicture, PrvoukaQuestion } from './data/types';
import { PrvoukaPictureView } from './PrvoukaKit';
import type { IllustrationLookup } from './illustrations';

/**
 * Piktogram tématu v nastavení hry (jako u aktivit v Početníčku): malá dlaždice s obrázkem
 * přímo z úloh toho tématu – planeta, zvíře, hodiny, značka… Nic se nekreslí ručně,
 * takže piktogram má každé téma každé hry.
 */
const BOARD_EMOJI: Record<string, string> = { months: '📅', week: '🗓️', dayparts: '🌗', seasons: '🍂' };

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function picturesOf(q: PrvoukaQuestion): PrvoukaPicture[] {
  if (q.picture) return [q.picture];
  const t = q.task;
  if (t.kind === 'choice') return t.options.map((o) => o.picture).filter(Boolean).slice(0, 2) as PrvoukaPicture[];
  if (t.kind === 'order') return t.items.map((i) => i.picture).filter(Boolean).slice(0, 3) as PrvoukaPicture[];
  if (t.kind === 'clock-set') return [{ kind: 'clock', hour: t.hour, minute: t.minute }];
  if (t.kind === 'board') return [{ kind: 'emoji', emoji: BOARD_EMOJI[t.board] ?? '📅', alt: '' }];
  return [];
}

export function topicPictures(game: PrvoukaGame, topicId: string, grade: PrvoukaGrade): PrvoukaPicture[] {
  try {
    const pool = game.buildPool({ grade, topics: [topicId], random: seeded(7) });
    for (const q of pool) {
      const pics = picturesOf(q);
      if (pics.length) return pics;
    }
  } catch {
    // téma bez úloh v tomhle ročníku – použije se obálka hry
  }
  return [game.cover];
}

export function TopicPictogram({ game, topicId, grade, tint, illustrations, size = 56 }: { game: PrvoukaGame; topicId: string; grade: PrvoukaGrade; tint: string; illustrations: IllustrationLookup; size?: number }) {
  const pics = useMemo(() => topicPictures(game, topicId, grade), [game, topicId, grade]);
  const n = pics.length;
  // Jeden obrázek velký, dva až tři menší vedle sebe (překrývají se jako hromádka kartiček).
  const inner = n === 1 ? size * 0.78 : n === 2 ? size * 0.5 : size * 0.4;
  return (
    <span
      aria-hidden="true"
      className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, background: tint }}
    >
      <span className="flex items-center justify-center" style={{ gap: n > 1 ? 1 : 0 }}>
        {pics.map((p, i) => (
          <span key={i} className="flex items-center justify-center" style={{ width: inner, height: inner }}>
            <PrvoukaPictureView picture={p} illustrations={illustrations} size={inner} height={inner} />
          </span>
        ))}
      </span>
    </span>
  );
}
