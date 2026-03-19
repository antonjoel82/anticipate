import type { WeightedFactor, FactorContext } from './types.js'

/**
 * Compute confidence as the product of weighted factors.
 *
 * For each factor: effective = 1 - weight × (1 - raw)
 * weight=0 makes the factor invisible (always 1.0).
 * weight=1 applies the raw score directly.
 *
 * All inputs are clamped to [0, 1] and guarded against NaN/Infinity.
 */
export function computeConfidence(factors: WeightedFactor[], ctx: FactorContext): number {
  let confidence = 1.0
  for (const { compute, weight } of factors) {
    const rawUnclamped = compute(ctx)
    const raw = Number.isFinite(rawUnclamped) ? Math.max(0, Math.min(1, rawUnclamped)) : 0
    const w = Math.max(0, Math.min(1, weight))
    if (raw === 0 && w === 1) return 0
    confidence *= 1 - w * (1 - raw)
  }
  return confidence
}
