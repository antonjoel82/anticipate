# useTrajectory Design Document

> **Package**: `foresee`
> **Date**: 2026-03-15
> **Status**: Approved
> **Approach**: B — Better Predictions, React-First

## Overview

A standalone TypeScript library that predicts cursor intent using finite-segment/AABB intersection with EWMA-smoothed velocity extrapolation. Ships a framework-agnostic core engine and a thin React hook wrapper. Consumers register DOM elements and receive real-time trajectory snapshots — including intersection status, distance, velocity, and a confidence score — usable in both callbacks and render logic.

## Prior Art & Competitive Analysis

**ForesightJS** (`js.foresight`, 1,505 stars) is the closest existing library. Our audit identified critical weaknesses we address:

| ForesightJS Weakness | Foresee Improvement |
|---|---|
| No cleanup on unmount — memory leaks | Proper `useEffect` cleanup via ref callbacks |
| Dependency array trap — infinite re-registrations | Stable string ID registration, no object deps |
| `registerResults` in `useRef` — not reactive | `useSyncExternalStore` — render-time snapshot access |
| No SSR safety — crashes in Next.js/Remix | Lazy initialization, zero module-level DOM access |
| Naive linear velocity — overshoots on deceleration | EWMA smoothing + acceleration-based window adjustment |
| No confidence scoring — fires on any intersection | `confidence = speed x trajectory_straightness` |
| Single callback, no enter/leave patterns | Trigger profiles: once, on_enter, every_frame, cooldown |
| 120ms prediction window | Research-informed default (150ms), configurable 50-500ms |

Additional references studied: jQuery menu-aim (slope comparison), Premonish (Voronoi + quadratic velocity), cursorKalman (4-state Kalman filter), mpredict.js (KNN velocity profiles).

Academic basis: Diaz et al. (SIGIR 2016) on optimal prediction windows, Su et al. (CHI 2014) on velocity as intent signal, Accot & Zhai (CHI 1997) Steering Law.

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| Package scope | Standalone npm library | Clean boundary, testable in isolation, framework-agnostic core |
| Update strategy | `requestAnimationFrame` | Syncs with browser paint cycle, ~60fps cap, no wasted computation |
| Ray model | Finite segment (current -> predicted point) | Fewer false positives than infinite ray; validated by ForesightJS approach |
| Return shape | `{ register, getSnapshot, useSnapshot }` | `getSnapshot(id)` for non-reactive reads, `useSnapshot(id)` for per-element reactive subscriptions. Avoids full-map re-renders. |
| Instance isolation | Independent per `useTrajectory()` call | Simple mental model, no shared singleton, no cross-component coupling |
| Core/React separation | `foresee/core` + `foresee/react` entrypoints | Framework-agnostic engine; trivial to wrap for Vue/Svelte/Solid |
| Type system | Hand-rolled validation with TypeScript types | Zero-dependency validation. No Zod (13KB) — keeps library under 5KB. Validators are simple guard functions with descriptive errors. |
| Detection area param | `tolerance` (primary), `hitSlop` (alias) | Self-documenting name; hitSlop retained for React Native familiarity |
| Distance calculation | Nearest edge of AABB | Standard approach, returns 0 when cursor is inside element |
| Velocity shape | Full vector `{ x, y, magnitude, angle }` | Enables directional reasoning in `triggerOn` |
| Rect caching | ResizeObserver + scroll listener | Never `getBoundingClientRect()` in hot path |
| Cleanup behavior | Immediate removal on unmount | Prevents stale snapshots, no lingering state |
| SSR safety | All DOM access inside effects/subscriptions | Safe in Next.js, Remix, TanStack Start |
| Event target | `document` default, configurable | Covers most use cases; configurable for shadow DOM or scoped areas |
| triggerOn reasons | Fixed union type | `'trajectory' \| 'distance' \| 'velocity' \| 'confidence' \| 'custom'` |
| Constants convention | `SCREAMING_SNAKE_CASE` defaults | All magic numbers extracted; tunables become configurable params |

## Package Architecture

```
foresee/
  src/
    core/                    # Framework-agnostic engine
      engine.ts              # TrajectoryEngine class
      prediction.ts          # EWMA smoothing, segment extrapolation
      intersection.ts        # Branchless slab method
      distance.ts            # Point-to-AABB distance
      types.ts               # TypeScript types (interfaces, type aliases)
      validators.ts          # Hand-rolled guard functions for runtime validation
      constants.ts           # SCREAMING_SNAKE_CASE defaults
      buffer.ts              # Circular buffer
      index.ts               # Public exports
    react/                   # React-specific wrapper
      useTrajectory.ts       # Hook (thin wrapper over engine)
      index.ts               # Public exports
    index.ts                 # Re-export everything
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
```

## Public API

### React Hook

```typescript
import { useTrajectory } from 'foresee/react'

// Power-user API (full control)
function NavButton({ href, label }: Props) {
  const { register, useSnapshot } = useTrajectory({
    predictionWindow: 150,
  })

  const ref = register<HTMLAnchorElement>('nav-home', {
    triggerOn: (snap) => ({
      isTriggered: snap.isIntersecting && snap.confidence > 0.6,
      reason: 'trajectory',
    }),
    whenTriggered: () => prefetch(href),
    profile: { type: 'on_enter' },
    tolerance: { top: 10, left: 20, right: 20, bottom: 10 },
  })

  // Per-element subscription — only re-renders THIS component
  const snap = useSnapshot('nav-home')
  const scale = snap?.isIntersecting ? 1.02 : 1

  return (
    <a ref={ref} style={{ transform: `scale(${scale})` }}>
      {label}
    </a>
  )
}

// Convenience API (80% use case)
function SimpleLink({ href, label }: Props) {
  const { register } = useTrajectory()

  const ref = register<HTMLAnchorElement>('link', {
    whenApproaching: () => prefetch(href),
    tolerance: 20,
  })

  return <a ref={ref}>{label}</a>
}
```

### Hook Signature

```typescript
function useTrajectory(options?: EngineOptions): {
  register: <T extends HTMLElement>(
    id: string,
    config: ElementConfig
  ) => RefCallback<T>
  trigger: (id: string, options?: TriggerOptions) => void        // Imperatively fire callback
  getSnapshot: (id: string) => TrajectorySnapshot | undefined   // Non-reactive read
  useSnapshot: (id: string) => TrajectorySnapshot | undefined   // Per-element reactive subscription
}
```

### Convenience API (80% Use Case)

For consumers who just want "do X when cursor approaches element":

```typescript
function NavLink({ href, label }: Props) {
  const { register } = useTrajectory()

  const ref = register<HTMLAnchorElement>('nav-home', {
    whenApproaching: () => prefetch(href),   // Fires on_enter when isIntersecting && confidence > 0.5
    tolerance: 20,
  })

  return <a ref={ref}>{label}</a>
}
```

`whenApproaching` is syntactic sugar that expands to:

```typescript
{
  triggerOn: (snap) => ({
    isTriggered: snap.isIntersecting && snap.confidence > DEFAULT_CONFIDENCE_THRESHOLD,
    reason: 'trajectory',
  }),
  whenTriggered: callback,
  profile: { type: 'on_enter' },
}
```

Both APIs coexist — use `whenApproaching` for the common case, full `triggerOn`/`whenTriggered` for power users.

### Core Engine (Framework-Agnostic)

```typescript
import { TrajectoryEngine } from 'foresee/core'

const engine = new TrajectoryEngine({ predictionWindow: 150 })
engine.register('btn', buttonElement, config)
engine.connect()

// Subscribe to changes
const unsubscribe = engine.subscribe(() => {
  const snap = engine.getSnapshot('btn')
  // ...
})

// Cleanup
engine.disconnect()
engine.destroy()
```

### Engine Class

```typescript
class TrajectoryEngine {
  constructor(options?: EngineOptions)                              // Validated at boundary
  register(id: string, el: HTMLElement, config: ElementConfig): void // Re-register updates config
  unregister(id: string): void
  trigger(id: string, options?: TriggerOptions): void              // Imperatively fire callback
  getSnapshot(id: string): TrajectorySnapshot | undefined
  getAllSnapshots(): ReadonlyMap<string, TrajectorySnapshot>
  subscribe(callback: () => void): () => void                      // Global subscription
  subscribeToElement(id: string): (cb: () => void) => () => void   // Per-element subscription
  connect(): void                                                  // Start listening
  disconnect(): void                                               // Stop listening
  destroy(): void                                                  // Full teardown
}
```

Calling `register()` with an existing ID **updates the config** for that element (does not create a duplicate). This is how the React hook handles config changes without stale closures.

### Imperative Trigger

```typescript
type TriggerOptions = { dangerouslyIgnoreProfile?: boolean }

engine.trigger('btn')                                    // Respects profile (once won't re-fire, cooldown checks interval)
engine.trigger('btn', { dangerouslyIgnoreProfile: true }) // Always fires, ignoring profile state
```

Use cases: programmatic prefetch, keyboard navigation, testing, mobile fallback. Calls `whenTriggered()` directly — skips `triggerOn` predicate evaluation. Does NOT fabricate snapshot data.

## Type System

Hand-rolled TypeScript types with lightweight guard-function validators. Zero external dependencies — no Zod (13KB), no valibot. Validators are simple functions that throw descriptive errors on invalid input, used only at registration boundaries (not in the hot path).

### Core Types

```typescript
// Point
{ x: number, y: number }

// Velocity
{ x: number, y: number, magnitude: number, angle: number }

// Tolerance (union)
number | { top: number, right: number, bottom: number, left: number }

// TrajectorySnapshot (per-element output)
{
  isIntersecting: boolean,
  distancePx: number,      // nearest edge, 0 when inside
  velocity: Velocity,
  confidence: number,       // 0-1, speed x trajectory straightness
  predictedPoint: Point,
}

// TriggerResult (returned by triggerOn)
{
  isTriggered: boolean,
  reason?: 'trajectory' | 'distance' | 'velocity' | 'confidence' | 'custom',
}

// TriggerProfile (discriminated union)
{ type: 'once' }
| { type: 'on_enter' }
| { type: 'every_frame' }
| { type: 'cooldown', intervalMs: number }

// ElementConfig
{
  triggerOn: (snapshot: TrajectorySnapshot) => TriggerResult,
  whenTriggered: () => void | Promise<void>,
  profile: TriggerProfile,
  tolerance?: Tolerance,    // hitSlop accepted as alias
}

// EngineOptions
{
  predictionWindow?: number,   // 50-500, default 150
  smoothingFactor?: number,    // 0-1, default 0.3
  bufferSize?: number,         // 2-30, default 8
  eventTarget?: EventTarget,   // default: document
  defaultTolerance?: Tolerance, // default: 0
}
```

## Prediction Engine

### Update Loop (per rAF frame)

```
pointermove events accumulate
  -> rAF fires
    -> Read latest cursor position
    -> Update circular buffer (position + timestamp)
    -> Compute EWMA-smoothed velocity
    -> Detect acceleration (velocity delta)
    -> Extrapolate predicted point (cursor + smoothedVelocity x adjustedWindow)
    -> Compute confidence (speed x trajectory straightness)
    -> For each registered element:
        -> Get cached bounding rect (expanded by tolerance)
        -> Slab method: test segment [cursor -> predictedPoint] vs expanded AABB
        -> Compute distance: nearest edge of AABB
        -> Build snapshot
        -> Evaluate triggerOn(snapshot)
        -> If triggered, fire whenTriggered per profile rules
    -> Notify subscribers (triggers useSyncExternalStore re-render)
```

### EWMA Velocity Smoothing

Replaces ForesightJS's noisy "oldest-to-newest" velocity calculation with exponentially weighted moving average:

```typescript
// alpha = smoothingFactor (default DEFAULT_SMOOTHING_FACTOR = 0.3)
// Higher alpha = more responsive, less smooth
// Lower alpha = more smooth, more latent
smoothedVx = alpha * rawVx + (1 - alpha) * smoothedVx
smoothedVy = alpha * rawVy + (1 - alpha) * smoothedVy
```

Cost: 2 multiplications per frame. Eliminates jitter from trackpad noise, sub-pixel movements, and motor-impaired tremor.

### Acceleration Detection

Track velocity magnitude over recent frames. When user decelerates (approaching target), shorten the prediction window to prevent overshoot:

```typescript
const currentSpeed = Math.hypot(smoothedVx, smoothedVy)
const acceleration = (currentSpeed - previousSpeed) / dt

// Deceleration shortens prediction window (prevents overshoot)
const adjustedWindow = acceleration < 0
  ? predictionWindow * Math.max(DECELERATION_WINDOW_FLOOR, 1 + acceleration * DECELERATION_DAMPENING)
  : predictionWindow
```

### Confidence Scoring (Temporal Stability)

Confidence measures how many consecutive frames a given element has been the predicted target. This approach is grounded in prior art (Premonish by Conlen, 2016) and avoids the speed paradox where users slow down near targets (Fitts's Law), which would incorrectly lower a speed-based confidence score.

```typescript
// Per-element: track consecutive frames where isIntersecting === true
if (isIntersecting) {
  elementState.consecutiveHitFrames++
} else {
  elementState.consecutiveHitFrames = 0
}

// Confidence saturates at CONFIDENCE_SATURATION_FRAMES (default 10)
const confidence = Math.min(1, elementState.consecutiveHitFrames / CONFIDENCE_SATURATION_FRAMES)
```

Properties:
- 0.0 = trajectory just started intersecting (1 frame)
- 0.5 = intersecting for 5 consecutive frames (~83ms at 60fps)
- 1.0 = intersecting for 10+ consecutive frames (~167ms at 60fps)
- Resets to 0 immediately when trajectory stops intersecting

This maps directly to UX intent: a trajectory that *stays* pointed at an element across multiple frames is a stronger signal than a momentary intersection.

Exposed in every snapshot. Consumers threshold it in `triggerOn`.

### Intersection Test (Branchless Slab Method)

Per Tavian Barnes (2022). Handles edge cases — parallel rays, cursor inside element, NaN — correctly via IEEE 754 semantics:

```typescript
function segmentAABB(
  ox: number, oy: number,
  dx: number, dy: number,
  minX: number, minY: number,
  maxX: number, maxY: number
): boolean {
  const invDx = 1 / dx
  const invDy = 1 / dy
  const t1x = (minX - ox) * invDx
  const t2x = (maxX - ox) * invDx
  const t1y = (minY - oy) * invDy
  const t2y = (maxY - oy) * invDy
  const tmin = Math.max(Math.min(t1x, t2x), Math.min(t1y, t2y))
  const tmax = Math.min(Math.max(t1x, t2x), Math.max(t1y, t2y))
  return tmax >= 0 && tmin <= tmax && tmin <= 1
}
```

The `tmin <= 1` constraint ensures detection only within the finite segment (cursor to predicted point), not along an infinite ray.

### Distance Calculation

Nearest edge of the AABB, clamped:

```typescript
function distanceToAABB(px: number, py: number, rect: Rect): number {
  const dx = Math.max(rect.left - px, 0, px - rect.right)
  const dy = Math.max(rect.top - py, 0, py - rect.bottom)
  return Math.hypot(dx, dy)
}
```

Returns 0 when cursor is inside the element.

### Rect Caching

Bounding rects cached and refreshed via:
- `ResizeObserver` — element resizes
- Scroll listener — window scrolls (recalculate visible rects)
- Manual `engine.invalidateRects()` — escape hatch

Never calls `getBoundingClientRect()` in the rAF hot path.

## Trigger System

### Profiles

| Profile | Behavior | Use Case |
|---|---|---|
| `once` | Fires once, permanently deactivated | Prefetch a route |
| `on_enter` | Fires on `false -> true` transition | Hover preview |
| `every_frame` | Fires every rAF while triggered | Continuous proximity effect |
| `cooldown` | Like `on_enter` with minimum interval | Analytics ping |

### Per-Element State Machine

```typescript
interface ElementState {
  wasTriggeredLastFrame: boolean
  hasFiredOnce: boolean
  lastFireTimestamp: number
  isActive: boolean
}
```

Profile evaluation per frame:

```
once:        triggered AND NOT hasFiredOnce
on_enter:    triggered AND NOT wasTriggeredLastFrame
every_frame: triggered
cooldown:    triggered AND NOT wasTriggeredLastFrame AND (now - lastFire >= intervalMs)
```

### Callback Execution

- Async-safe: `whenTriggered` can return `void` or `Promise<void>`
- Error-isolated: each callback wrapped in try/catch; errors logged, never crash the engine
- Non-blocking: callbacks fire-and-forget; engine does not await them

### Cleanup

When element unmounts (ref callback receives `null`):
1. Snapshot removed from map immediately
2. Element state cleared
3. Pending cooldown timers cleared
4. ResizeObserver unobserved
5. Subscribers notified

## Constants

All magic numbers extracted to `SCREAMING_SNAKE_CASE`. Tunables become parameters with default constants:

```typescript
// Prediction
export const DEFAULT_PREDICTION_WINDOW_MS = 150
export const MIN_PREDICTION_WINDOW_MS = 50
export const MAX_PREDICTION_WINDOW_MS = 500

// Smoothing
export const DEFAULT_SMOOTHING_FACTOR = 0.3

// Buffer
export const DEFAULT_BUFFER_SIZE = 8
export const MIN_BUFFER_SIZE = 2
export const MAX_BUFFER_SIZE = 30

// Tolerance
export const DEFAULT_TOLERANCE = 0
export const MAX_TOLERANCE = 2000

// Acceleration
export const DECELERATION_WINDOW_FLOOR = 0.3
export const DECELERATION_DAMPENING = 0.5

// Confidence (temporal stability)
export const CONFIDENCE_SATURATION_FRAMES = 10   // Frames to reach confidence=1.0
export const MIN_VELOCITY_THRESHOLD = 5           // px/s below which cursor is "stopped"

// Cooldown
export const DEFAULT_COOLDOWN_INTERVAL_MS = 300

// Convenience API
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5
```

## React Hook Implementation

The hook is a thin wrapper over `TrajectoryEngine`:

```typescript
function useTrajectory(options?: EngineOptions) {
  const engineRef = useRef<TrajectoryEngine | null>(null)
  const configsRef = useRef<Map<string, ElementConfig>>(new Map())

  // Lazy init (SSR-safe — no DOM access until effect)
  if (typeof window !== 'undefined' && !engineRef.current) {
    engineRef.current = new TrajectoryEngine(options)
  }

  // Connect/disconnect lifecycle
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.connect()
    return () => engine.disconnect()
  }, [])

  // register() stores latest config in a ref, avoiding stale closure issues.
  // The ref callback re-registers with fresh config on every call.
  const register = useCallback(<T extends HTMLElement>(
    id: string,
    config: ElementConfig
  ): RefCallback<T> => {
    configsRef.current.set(id, config)
    return (element: T | null) => {
      const engine = engineRef.current
      if (!engine) return
      if (element) {
        // Always use latest config from ref (not closure)
        const latestConfig = configsRef.current.get(id) ?? config
        engine.register(id, element, latestConfig)
      } else {
        engine.unregister(id)
        configsRef.current.delete(id)
      }
    }
  }, [])

  // Per-element reactive subscription — only re-renders when THIS element's snapshot changes
  const useSnapshot = (id: string): TrajectorySnapshot | undefined => {
    return useSyncExternalStore(
      engineRef.current?.subscribeToElement(id) ?? (() => () => {}),
      () => engineRef.current?.getSnapshot(id),
      () => undefined,  // SSR fallback
    )
  }

  // Non-reactive read (for event handlers, effects)
  const getSnapshot = (id: string) => engineRef.current?.getSnapshot(id)

  return { register, useSnapshot, getSnapshot }
}
```

Key properties:
- `register` stores config in a ref — always uses the latest config, never stale closures
- `useSnapshot(id)` subscribes to a single element — only re-renders when THAT element's data changes
- `getSnapshot(id)` is non-reactive — for use in event handlers and effects
- SSR returns `undefined` for snapshots (no crashes, no hydration mismatch)
- Cleanup happens automatically via ref callback null

## Build & Test Tooling

| Tool | Choice | Rationale |
|---|---|---|
| Build | `tsup` | Zero-config library bundler. ESM + CJS dual output. Tree-shakeable. |
| Test runner | `vitest` | Fast, native ESM, TypeScript-first, compatible with happy-dom. |
| Test environment | `happy-dom` | Lighter than jsdom (~2x faster), sufficient for DOM mocking. |
| TypeScript | `strict: true` | Non-negotiable for a library. |
| Package exports | Conditional exports (`foresee/core`, `foresee/react`) | Proper subpath exports via `package.json` `exports` field. |

## Testing Strategy

### Unit Tests
- Circular buffer: add, wrap, resize, clear
- EWMA smoothing: convergence, responsiveness
- Slab method: all intersection/miss cases, edge cases (parallel, inside, NaN)
- Distance calculation: inside, outside, on edge, corner
- Confidence scoring: straight/fast, curved/slow, stationary
- Trigger profiles: state transitions for each profile type

### Integration Tests
- Full loop: register -> move -> snapshot update -> trigger -> callback
- Cleanup: unmount -> snapshot removed -> no stale callbacks
- Multiple elements: independent snapshots, no cross-contamination

### Performance Tests
- 100 elements at 60fps: measure frame time
- 1000 elements at 60fps: measure frame time
- Memory: register/unregister 1000 cycles, measure heap growth

## Out of Scope (v1)

- Pluggable prediction algorithms (Kalman, Voronoi)
- Spatial indexing (quadtree) for 500+ elements
- Per-element prediction settings
- Scroll prediction / tab prediction
- Touch/mobile trajectory (research shows it doesn't transfer)
- DevTools visualization overlay
- Analytics/telemetry integration
- iframe / Shadow DOM support
