import type { Point, Velocity, TimestampedPoint } from './types.js'
import { CircularBuffer } from './buffer.js'
import {
  DEFAULT_PREDICTION_WINDOW_MS,
  DEFAULT_SMOOTHING_FACTOR,
  DEFAULT_BUFFER_SIZE,
  DECELERATION_WINDOW_FLOOR,
  DECELERATION_DAMPENING,
  MIN_VELOCITY_THRESHOLD,
} from './constants.js'

export type PredictionConfig = {
  smoothingFactor: number
  predictionWindowMs: number
  bufferSize: number
}

export type PredictionState = {
  smoothedVelocity: Velocity
  previousSpeed: number
  adjustedWindowMs: number
  predictedPoint: Point
  currentPosition: Point
  buffer: CircularBuffer<TimestampedPoint>
  config: PredictionConfig
}

export function createPredictionState(config?: Partial<PredictionConfig>): PredictionState {
  const resolvedConfig: PredictionConfig = {
    smoothingFactor: config?.smoothingFactor ?? DEFAULT_SMOOTHING_FACTOR,
    predictionWindowMs: config?.predictionWindowMs ?? DEFAULT_PREDICTION_WINDOW_MS,
    bufferSize: config?.bufferSize ?? DEFAULT_BUFFER_SIZE,
  }

  return {
    smoothedVelocity: { x: 0, y: 0, magnitude: 0, angle: 0 },
    previousSpeed: 0,
    adjustedWindowMs: resolvedConfig.predictionWindowMs,
    predictedPoint: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    buffer: new CircularBuffer<TimestampedPoint>(resolvedConfig.bufferSize),
    config: resolvedConfig,
  }
}

export function updatePrediction(state: PredictionState, point: TimestampedPoint): void {
  const previous: TimestampedPoint | undefined = state.buffer.getLast()
  state.buffer.add(point)
  state.currentPosition.x = point.x
  state.currentPosition.y = point.y

  if (!previous) {
    state.predictedPoint.x = point.x
    state.predictedPoint.y = point.y
    return
  }

  const dt: number = (point.timestamp - previous.timestamp) / 1000
  if (dt <= 0) {
    state.predictedPoint.x = point.x
    state.predictedPoint.y = point.y
    return
  }

  const rawVx: number = (point.x - previous.x) / dt
  const rawVy: number = (point.y - previous.y) / dt

  const alpha: number = state.config.smoothingFactor
  const smoothedVx: number = alpha * rawVx + (1 - alpha) * state.smoothedVelocity.x
  const smoothedVy: number = alpha * rawVy + (1 - alpha) * state.smoothedVelocity.y

  const currentSpeed: number = Math.hypot(smoothedVx, smoothedVy)
  const angle: number = Math.atan2(smoothedVy, smoothedVx)

  state.smoothedVelocity.x = smoothedVx
  state.smoothedVelocity.y = smoothedVy
  state.smoothedVelocity.magnitude = currentSpeed
  state.smoothedVelocity.angle = angle

  const acceleration: number = (currentSpeed - state.previousSpeed) / dt
  state.previousSpeed = currentSpeed

  if (acceleration < 0) {
    const windowScale: number = Math.max(
      DECELERATION_WINDOW_FLOOR,
      1 + acceleration * DECELERATION_DAMPENING / Math.max(currentSpeed, MIN_VELOCITY_THRESHOLD),
    )
    state.adjustedWindowMs = state.config.predictionWindowMs * windowScale
  } else {
    state.adjustedWindowMs = state.config.predictionWindowMs
  }

  const windowSeconds: number = state.adjustedWindowMs / 1000

  if (currentSpeed < MIN_VELOCITY_THRESHOLD) {
    state.predictedPoint.x = point.x
    state.predictedPoint.y = point.y
  } else {
    state.predictedPoint.x = point.x + smoothedVx * windowSeconds
    state.predictedPoint.y = point.y + smoothedVy * windowSeconds
  }
}
