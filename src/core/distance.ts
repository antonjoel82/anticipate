import type { Rect } from './types.js'

export function distanceToAABB(px: number, py: number, rect: Rect): number {
  const dx: number = Math.max(rect.left - px, 0, px - rect.right)
  const dy: number = Math.max(rect.top - py, 0, py - rect.bottom)
  return Math.hypot(dx, dy)
}
