import { describe, it, expect } from 'vitest'
import { computeConfidence } from './compute.js'
import type { WeightedFactor, FactorContext } from './types.js'

// Minimal stub context — factors in these tests return fixed values
const stubCtx = {} as FactorContext

describe('computeConfidence', () => {
  it('returns 1.0 with no factors', () => {
    expect(computeConfidence([], stubCtx)).toBe(1.0)
  })

  it('returns raw value when weight is 1.0', () => {
    const factors: WeightedFactor[] = [
      { compute: () => 0.7, weight: 1.0 },
    ]
    expect(computeConfidence(factors, stubCtx)).toBeCloseTo(0.7)
  })

  it('returns 1.0 when weight is 0 (factor is invisible)', () => {
    const factors: WeightedFactor[] = [
      { compute: () => 0.3, weight: 0 },
    ]
    expect(computeConfidence(factors, stubCtx)).toBe(1.0)
  })

  it('multiplies weighted factors together', () => {
    const factors: WeightedFactor[] = [
      { compute: () => 0.8, weight: 1.0 },
      { compute: () => 0.5, weight: 1.0 },
    ]
    expect(computeConfidence(factors, stubCtx)).toBeCloseTo(0.4)
  })

  it('softens factor with weight < 1', () => {
    // effective = 1 - 0.5 * (1 - 0.4) = 1 - 0.3 = 0.7
    const factors: WeightedFactor[] = [
      { compute: () => 0.4, weight: 0.5 },
    ]
    expect(computeConfidence(factors, stubCtx)).toBeCloseTo(0.7)
  })

  it('short-circuits to 0 when hard-gate factor returns 0', () => {
    const factors: WeightedFactor[] = [
      { compute: () => 0, weight: 1.0 },
      { compute: () => 0.9, weight: 1.0 },
    ]
    expect(computeConfidence(factors, stubCtx)).toBe(0)
  })

  it('clamps NaN raw to 0', () => {
    const factors: WeightedFactor[] = [
      { compute: () => NaN, weight: 0.5 },
    ]
    // NaN clamped to 0 → effective = 1 - 0.5*(1-0) = 0.5
    expect(computeConfidence(factors, stubCtx)).toBeCloseTo(0.5)
  })

  it('clamps raw > 1 to 1', () => {
    const factors: WeightedFactor[] = [
      { compute: () => 1.5, weight: 1.0 },
    ]
    expect(computeConfidence(factors, stubCtx)).toBe(1.0)
  })

  it('clamps raw < 0 to 0', () => {
    const factors: WeightedFactor[] = [
      { compute: () => -0.5, weight: 1.0 },
    ]
    expect(computeConfidence(factors, stubCtx)).toBe(0)
  })
})
