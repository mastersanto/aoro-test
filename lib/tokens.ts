/**
 * The design tokens, as data (feature 002 / VR-5).
 *
 * Defined here as well as in CSS so the palette can be checked by arithmetic:
 * every text-on-surface pair is asserted against WCAG AA in tests/lib/tokens.test.ts.
 * The mockups' dim grey (#6B7484) failed that check at 4.10:1 and was replaced.
 */

export const REJECTED_DIM = "#6B7484"; // kept so a test can assert it never returns

export const color = {
  /** Page ground and raised panels. */
  ground: "#0B0E14",
  panel: "#10141C",
  /** Text ramp, brightest first. */
  text: "#E8ECF3",
  muted: "#9AA3B2",
  dim: "#79828F", // was #6B7484 — failed AA for body text
  /** Outcome pairing. Never the sole carrier of meaning (VR-3). */
  up: "#3DDC97",
  down: "#F0616D",
  /** Reserved exclusively for the demo signal. Used for nothing else. */
  demo: "#FFC53D",
  /** Text placed on the up colour, e.g. a primary button. */
  onUp: "#06251A",
} as const;

/** Every (foreground, background) pair the UI actually renders. */
export const TEXT_PAIRS: ReadonlyArray<{ name: string; fg: string; bg: string; large?: boolean }> = [
  { name: "body on ground", fg: color.text, bg: color.ground },
  { name: "body on panel", fg: color.text, bg: color.panel },
  { name: "muted on ground", fg: color.muted, bg: color.ground },
  { name: "muted on panel", fg: color.muted, bg: color.panel },
  { name: "dim on ground", fg: color.dim, bg: color.ground },
  { name: "dim on panel", fg: color.dim, bg: color.panel },
  { name: "up on ground", fg: color.up, bg: color.ground },
  { name: "up on panel", fg: color.up, bg: color.panel },
  { name: "down on ground", fg: color.down, bg: color.ground },
  { name: "down on panel", fg: color.down, bg: color.panel },
  { name: "demo on ground", fg: color.demo, bg: color.ground },
  { name: "demo on panel", fg: color.demo, bg: color.panel },
  { name: "button text on up", fg: color.onUp, bg: color.up },
];

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2 contrast ratio, 1..21. */
export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
