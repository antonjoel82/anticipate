export { TrajectoryEngine } from './engine.js'
export { segmentAABB } from './intersection.js'
export { distanceToAABB } from './distance.js'
export { CircularBuffer } from './buffer.js'
export { createPredictionState, updatePrediction } from './prediction.js'
export { createElementState, shouldFire, updateElementState } from './triggers.js'
export { validateEngineOptions, validateElementConfig, normalizeTolerance, normalizeZones } from './validators.js'

export type {
  Point,
  Velocity,
  Tolerance,
  ToleranceRect,
  ToleranceZone,
  NormalizedZone,
  Rect,
  TrajectorySnapshot,
  TriggerReason,
  TriggerResult,
  TriggerProfile,
  TriggerProfileOnce,
  TriggerProfileOnEnter,
  TriggerProfileEveryFrame,
  TriggerProfileCooldown,
  ElementConfig,
  ConvenienceConfig,
  RegisterConfig,
  EngineOptions,
  ElementState,
  TimestampedPoint,
  TriggerOptions,
} from './types.js'

export type { PredictionState, PredictionConfig } from './prediction.js'

export {
  DEFAULT_PREDICTION_WINDOW_MS,
  MIN_PREDICTION_WINDOW_MS,
  MAX_PREDICTION_WINDOW_MS,
  DEFAULT_SMOOTHING_FACTOR,
  DEFAULT_BUFFER_SIZE,
  MIN_BUFFER_SIZE,
  MAX_BUFFER_SIZE,
  DEFAULT_TOLERANCE,
  MAX_TOLERANCE,
  DECELERATION_WINDOW_FLOOR,
  DECELERATION_DAMPENING,
  CONFIDENCE_SATURATION_FRAMES,
  CONFIDENCE_DECAY_RATE,
  MIN_VELOCITY_THRESHOLD,
  DEFAULT_COOLDOWN_INTERVAL_MS,
  DEFAULT_CONFIDENCE_THRESHOLD,
  HOVER_VELOCITY_THRESHOLD,
  MAX_TOLERANCE_ZONES,
} from './constants.js'
