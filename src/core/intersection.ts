// Branchless slab method per Tavian Barnes (2022).
// Relies on IEEE 754 semantics: 1/0=Infinity, NaN propagation handles axis-aligned rays.
// tmin <= 1 constrains to finite segment [origin → origin+direction], not infinite ray.
export function segmentAABB(
  ox: number, oy: number,
  dx: number, dy: number,
  minX: number, minY: number,
  maxX: number, maxY: number,
): boolean {
  if (dx === 0 && dy === 0) return false

  const invDx: number = 1 / dx
  const invDy: number = 1 / dy

  const t1x: number = (minX - ox) * invDx
  const t2x: number = (maxX - ox) * invDx
  const t1y: number = (minY - oy) * invDy
  const t2y: number = (maxY - oy) * invDy

  const tmin: number = Math.max(Math.min(t1x, t2x), Math.min(t1y, t2y))
  const tmax: number = Math.min(Math.max(t1x, t2x), Math.max(t1y, t2y))

  return tmax >= 0 && tmin <= tmax && tmin <= 1
}
