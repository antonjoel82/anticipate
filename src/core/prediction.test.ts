import { describe, it, expect } from 'vitest'
import { createPredictionState, updatePrediction } from './prediction.js'
import type { TimestampedPoint } from './types.js'

function simulateConstantVelocity(
  count: number,
  dxPerFrame: number,
  dyPerFrame: number,
  frameDurationMs: number,
): Array<TimestampedPoint> {
  const points: Array<TimestampedPoint> = []
  for (let i = 0; i < count; i++) {
    points.push({ x: i * dxPerFrame, y: i * dyPerFrame, timestamp: i * frameDurationMs })
  }
  return points
}

describe('EWMA velocity smoothing', () => {
  it('converges to constant velocity', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })
    const points = simulateConstantVelocity(20, 10, 0, 16.67)
    for (const point of points) {
      updatePrediction(state, point)
    }
    expect(state.smoothedVelocity.x).toBeGreaterThan(400)
    expect(state.smoothedVelocity.x).toBeLessThan(700)
    expect(Math.abs(state.smoothedVelocity.y)).toBeLessThan(1)
  })

  it('smooths out jittery input', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })
    for (let i = 0; i < 20; i++) {
      updatePrediction(state, { x: i * 11, y: 0, timestamp: i * 16.67 })
    }
    const vx1: number = state.smoothedVelocity.x
    updatePrediction(state, { x: 20 * 11, y: 0, timestamp: 20 * 16.67 })
    const vx2: number = state.smoothedVelocity.x
    expect(Math.abs(vx2 - vx1)).toBeLessThan(50)
  })
})

describe('acceleration detection', () => {
  it('detects deceleration and shortens prediction window', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })

    for (let i = 0; i < 10; i++) {
      updatePrediction(state, { x: i * 20, y: 0, timestamp: i * 16.67 })
    }
    const windowFast: number = state.adjustedWindowMs

    for (let i = 10; i < 20; i++) {
      updatePrediction(state, { x: 200 + (i - 10) * 5, y: 0, timestamp: i * 16.67 })
    }
    const windowSlow: number = state.adjustedWindowMs

    expect(windowSlow).toBeLessThan(windowFast)
  })
})

describe('point extrapolation', () => {
  it('predicts point ahead of cursor in movement direction', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })
    for (let i = 0; i < 10; i++) {
      updatePrediction(state, { x: i * 10, y: 0, timestamp: i * 16.67 })
    }
    expect(state.predictedPoint.x).toBeGreaterThan(90)
    expect(Math.abs(state.predictedPoint.y)).toBeLessThan(5)
  })

  it('returns current position when stationary', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })
    updatePrediction(state, { x: 100, y: 100, timestamp: 0 })
    updatePrediction(state, { x: 100, y: 100, timestamp: 16.67 })
    updatePrediction(state, { x: 100, y: 100, timestamp: 33.34 })
    expect(state.predictedPoint.x).toBeCloseTo(100, 0)
    expect(state.predictedPoint.y).toBeCloseTo(100, 0)
  })

  it('predicts diagonally when moving diagonally', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })
    for (let i = 0; i < 15; i++) {
      updatePrediction(state, { x: i * 10, y: i * 10, timestamp: i * 16.67 })
    }
    expect(state.predictedPoint.x).toBeGreaterThan(140)
    expect(state.predictedPoint.y).toBeGreaterThan(140)
  })
})

describe('velocity vector', () => {
  it('computes magnitude and angle for horizontal movement', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })
    for (let i = 0; i < 15; i++) {
      updatePrediction(state, { x: i * 10, y: 0, timestamp: i * 16.67 })
    }
    expect(state.smoothedVelocity.magnitude).toBeGreaterThan(100)
    expect(Math.abs(state.smoothedVelocity.angle)).toBeLessThan(0.2)
  })

  it('computes correct angle for downward movement', () => {
    const state = createPredictionState({ smoothingFactor: 0.3, predictionWindowMs: 150, bufferSize: 8 })
    for (let i = 0; i < 15; i++) {
      updatePrediction(state, { x: 0, y: i * 10, timestamp: i * 16.67 })
    }
    expect(state.smoothedVelocity.angle).toBeCloseTo(Math.PI / 2, 1)
  })
})
