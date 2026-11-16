/** Tlačítko na kartě má sytější odstín barvy karty (jako v Početníčku). */
export function cardAccent(bg: string, dark = false): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg ?? '');
  if (!m) return dark ? '#3d36d6' : '#4a43e8';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  // Pastelová žlutá a oranžová by po ztmavení zhnědly – dostanou čistý oranžový / zlatý tón.
  const k = dark ? 6 : 0;
  // Jemné tóny jako v Početníčku (zelené tlačítko #55b886 u zelené karty).
  if (h >= 25 && h < 50) return `hsl(32 74% ${55 - k}%)`;
  if (h >= 50 && h < 75) return `hsl(42 72% ${50 - k}%)`;
  if (h >= 75 && h < 180) return `hsl(${Math.round(h)} 40% ${52 - k}%)`;
  if (h >= 180 && h < 210) return `hsl(${Math.round(h)} 52% ${44 - k}%)`;
  if (h < 25 || h >= 330) return `hsl(${Math.round(h)} 62% ${58 - k}%)`;
  return `hsl(${Math.round(h)} 58% ${58 - k}%)`;
}

/** Velmi světlý odstín barvy karty – podklad obrázku, aby postava na bílém nesplývala se stránkou. */
export function cardTint(bg: string, amount = 0.45): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(bg ?? '');
  if (!m) return '#f4f6fb';
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c * amount + 255 * (1 - amount));
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
