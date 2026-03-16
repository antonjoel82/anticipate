import { describe, it, expect } from 'vitest'
import { segmentAABB } from './intersection.js'

describe('segmentAABB', () => {
  const minX = 100
  const minY = 100
  const maxX = 200
  const maxY = 200

  it('detects hit when segment passes horizontally through box', () => {
    expect(segmentAABB(50, 150, 200, 0, minX, minY, maxX, maxY)).toBe(true)
  })

  it('detects miss when segment is parallel above box', () => {
    expect(segmentAABB(50, 50, 200, 0, minX, minY, maxX, maxY)).toBe(false)
  })

  it('detects hit when segment starts inside box', () => {
    expect(segmentAABB(150, 150, 10, 10, minX, minY, maxX, maxY)).toBe(true)
  })

  it('detects miss when segment is too short to reach box', () => {
    expect(segmentAABB(50, 150, 20, 0, minX, minY, maxX, maxY)).toBe(false)
  })

  it('detects miss when segment points away from box', () => {
    expect(segmentAABB(50, 150, -100, 0, minX, minY, maxX, maxY)).toBe(false)
  })

  it('returns false for zero-length segment (stationary cursor)', () => {
    expect(segmentAABB(50, 150, 0, 0, minX, minY, maxX, maxY)).toBe(false)
  })

  it('detects hit for vertical segment through box', () => {
    expect(segmentAABB(150, 50, 0, 200, minX, minY, maxX, maxY)).toBe(true)
  })

  it('detects hit for horizontal segment through box', () => {
    expect(segmentAABB(50, 150, 200, 0, minX, minY, maxX, maxY)).toBe(true)
  })

  it('detects hit for diagonal through corner', () => {
    expect(segmentAABB(50, 50, 200, 200, minX, minY, maxX, maxY)).toBe(true)
  })

  it('detects hit when segment enters box near edge', () => {
    expect(segmentAABB(50, 101, 200, 0, minX, minY, maxX, maxY)).toBe(true)
  })

  it('treats coplanar segment on slab face as miss (degenerate NaN case)', () => {
    expect(segmentAABB(50, 100, 200, 0, minX, minY, maxX, maxY)).toBe(false)
  })

  it('detects miss when segment ends just before box', () => {
    expect(segmentAABB(0, 150, 99, 0, minX, minY, maxX, maxY)).toBe(false)
  })

  it('detects hit when segment barely reaches box', () => {
    expect(segmentAABB(0, 150, 150, 0, minX, minY, maxX, maxY)).toBe(true)
  })
})
