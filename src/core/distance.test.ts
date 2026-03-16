import { describe, it, expect } from 'vitest'
import { distanceToAABB } from './distance.js'

describe('distanceToAABB', () => {
  const rect = { left: 100, top: 100, right: 200, bottom: 200 }

  it('returns 0 when point is inside', () => {
    expect(distanceToAABB(150, 150, rect)).toBe(0)
  })

  it('returns horizontal distance when point is left of box', () => {
    expect(distanceToAABB(80, 150, rect)).toBe(20)
  })

  it('returns horizontal distance when point is right of box', () => {
    expect(distanceToAABB(220, 150, rect)).toBe(20)
  })

  it('returns vertical distance when point is above box', () => {
    expect(distanceToAABB(150, 80, rect)).toBe(20)
  })

  it('returns vertical distance when point is below box', () => {
    expect(distanceToAABB(150, 220, rect)).toBe(20)
  })

  it('returns diagonal distance from top-left corner', () => {
    expect(distanceToAABB(80, 80, rect)).toBeCloseTo(Math.hypot(20, 20))
  })

  it('returns diagonal distance from bottom-right corner', () => {
    expect(distanceToAABB(220, 220, rect)).toBeCloseTo(Math.hypot(20, 20))
  })

  it('returns 0 when point is on left edge', () => {
    expect(distanceToAABB(100, 150, rect)).toBe(0)
  })

  it('returns 0 when point is on top edge', () => {
    expect(distanceToAABB(150, 100, rect)).toBe(0)
  })

  it('returns 0 when point is on corner', () => {
    expect(distanceToAABB(100, 100, rect)).toBe(0)
  })
})
