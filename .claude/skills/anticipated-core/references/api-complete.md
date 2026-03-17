# Complete API Reference

## TrajectoryEngine

### Constructor

```ts
new TrajectoryEngine(options?: EngineOptions)
```

Validates options on construction. Throws on invalid values.

### register(id, element, config)

```ts
engine.register(id: string, element: HTMLElement, config: RegisterConfig): void
```

- Re-registering same `id` updates config/element without resetting state.
- Handles ResizeObserver swap when element changes.
- Validates config. Throws on invalid tolerance values.

### unregister(id)

```ts
engine.unregister(id: string): void
```

No-op if `id` not registered. Cleans up ResizeObserver, snapshots, notifies subscribers.

### trigger(id, options?)

```ts
engine.trigger(id: string, options?: TriggerOptions): void
```

Imperatively fires element's `whenTriggered`. Respects trigger profile unless `{ dangerouslyIgnoreProfile: true }`.

Throws if `id` not registered.

### connect() / disconnect() / destroy()

```ts
engine.connect(): void      // Adds pointermove, scroll, ResizeObserver
engine.disconnect(): void   // Removes listeners, keeps registrations
engine.destroy(): void      // Full teardown. Clears everything. Idempotent.
```

### getSnapshot(id) / getAllSnapshots()

```ts
engine.getSnapshot(id: string): TrajectorySnapshot | undefined
engine.getAllSnapshots(): ReadonlyMap<string, TrajectorySnapshot>
```

Non-reactive reads. New object references each frame (safe for `useSyncExternalStore`).

### subscribe(cb) / subscribeToElement(id)

```ts
engine.subscribe(cb: () => void): () => void
engine.subscribeToElement(id: string): (cb: () => void) => () => void
```

`subscribe` fires on any element change. `subscribeToElement` returns a subscribe factory for one element. Both return unsubscribe functions.

### invalidateRects()

```ts
engine.invalidateRects(): void
```

Force bounding-rect refresh for all elements. Called automatically on scroll and resize.

## Exported Utility Functions

```ts
segmentAABB(ox, oy, dx, dy, minX, minY, maxX, maxY): boolean
distanceToAABB(px, py, rect: Rect): number
createPredictionState(config?): PredictionState
updatePrediction(state, point: TimestampedPoint): void
createElementState(): ElementState
shouldFire(profile, state, isTriggered, now): boolean
updateElementState(state, isTriggered, now, didFire): void
validateEngineOptions(options): void
validateElementConfig(config): void
normalizeTolerance(tolerance): ToleranceRect
```

## All Types

```ts
type Point = { x: number; y: number }
type Velocity = { x: number; y: number; magnitude: number; angle: number }
type Rect = { left: number; top: number; right: number; bottom: number }
type ToleranceRect = { top: number; right: number; bottom: number; left: number }
type Tolerance = number | ToleranceRect
type TimestampedPoint = { x: number; y: number; timestamp: number }

type TrajectorySnapshot = {
  isIntersecting: boolean
  distancePx: number
  velocity: Velocity
  confidence: number
  predictedPoint: Point
}

type TriggerResult = { isTriggered: boolean; reason?: TriggerReason }
type TriggerReason = 'trajectory' | 'distance' | 'velocity' | 'confidence' | 'custom'

type TriggerProfile =
  | { type: 'once' }
  | { type: 'on_enter' }
  | { type: 'every_frame' }
  | { type: 'cooldown'; intervalMs: number }

type ElementConfig = {
  triggerOn: (snapshot: TrajectorySnapshot) => TriggerResult
  whenTriggered: () => void | Promise<void>
  profile: TriggerProfile
  tolerance?: Tolerance
}

type ConvenienceConfig = {
  whenApproaching: () => void | Promise<void>
  tolerance?: Tolerance
}

type RegisterConfig = ElementConfig | ConvenienceConfig

type EngineOptions = {
  predictionWindow?: number
  smoothingFactor?: number
  bufferSize?: number
  eventTarget?: EventTarget
  defaultTolerance?: Tolerance
}

type TriggerOptions = { dangerouslyIgnoreProfile?: boolean }
type ElementState = { wasTriggeredLastFrame: boolean; hasFiredOnce: boolean; lastFireTimestamp: number; consecutiveHitFrames: number }
type PredictionConfig = { smoothingFactor: number; predictionWindowMs: number; bufferSize: number }
type PredictionState = { smoothedVelocity: Velocity; previousSpeed: number; adjustedWindowMs: number; predictedPoint: Point; currentPosition: Point; buffer: CircularBuffer<TimestampedPoint>; config: PredictionConfig }
```

## Constants

| Constant | Value |
|---|---|
| `DEFAULT_PREDICTION_WINDOW_MS` | 150 |
| `MIN_PREDICTION_WINDOW_MS` | 50 |
| `MAX_PREDICTION_WINDOW_MS` | 500 |
| `DEFAULT_SMOOTHING_FACTOR` | 0.3 |
| `DEFAULT_BUFFER_SIZE` | 8 |
| `MIN_BUFFER_SIZE` | 2 |
| `MAX_BUFFER_SIZE` | 30 |
| `DEFAULT_TOLERANCE` | 0 |
| `MAX_TOLERANCE` | 2000 |
| `DECELERATION_WINDOW_FLOOR` | 0.3 |
| `DECELERATION_DAMPENING` | 0.5 |
| `CONFIDENCE_SATURATION_FRAMES` | 10 |
| `MIN_VELOCITY_THRESHOLD` | 5 |
| `DEFAULT_COOLDOWN_INTERVAL_MS` | 300 |
| `DEFAULT_CONFIDENCE_THRESHOLD` | 0.5 |
