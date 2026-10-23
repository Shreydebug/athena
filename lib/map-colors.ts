const STOPS: Array<[number, [number, number, number, number]]> = [
  [0, [255, 255, 255, 0.18]],
  [0.28, [255, 236, 120, 0.6]],
  [0.52, [255, 176, 42, 0.82]],
  [0.74, [244, 92, 26, 0.95]],
  [1, [187, 14, 14, 1]],
];

function ramp(t: number): string {
  const c = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < STOPS.length - 2 && c > STOPS[i + 1][0]) i++;
  const [t0, [r0, g0, b0, a0]] = STOPS[i];
  const [t1, [r1, g1, b1, a1]] = STOPS[i + 1];
  const k = (c - t0) / (t1 - t0 || 1);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * k);
  return `rgba(${mix(r0, r1)},${mix(g0, g1)},${mix(b0, b1)},${+(a0 + (a1 - a0) * k).toFixed(3)})`;
}

export function heatColor(value: number, max: number): string {
  if (value <= 0 || max <= 0) return "rgba(255,255,255,0.14)";
  return ramp(Math.log1p(value) / Math.log1p(max));
}

export function heatStop(t: number): string {
  return ramp(t);
}