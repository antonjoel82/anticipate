# Math Internals

## EWMA Velocity Smoothing

Exponentially Weighted Moving Average. Each frame:

```
smoothedVx = alpha * rawVx + (1 - alpha) * prevSmoothedVx
smoothedVy = alpha * rawVy + (1 - alpha) * prevSmoothedVy
```

- `alpha` = `smoothingFactor` (default 0.3). Lower = smoother, more latency.
- Raw velocity = `(currentPos - prevPos) / dt` in px/s.

## Prediction Window (Adaptive)

Base window is `predictionWindow` ms (default 150). Shrinks on deceleration:

```
if acceleration < 0:
  scale = max(DECELERATION_WINDOW_FLOOR, 1 + accel * DAMPENING / speed)
  adjustedWindow = baseWindow * scale
else:
  adjustedWindow = baseWindow
```

Predicted point:
```
predictedX = cursorX + smoothedVx * (adjustedWindowMs / 1000)
predictedY = cursorY + smoothedVy * (adjustedWindowMs / 1000)
```

Below `MIN_VELOCITY_THRESHOLD` (5 px/s), predicted point = cursor position.

## Segment-AABB Intersection (Branchless Slab Method)

Tests finite segment `[cursor → predictedPoint]` against element's expanded AABB. Per Tavian Barnes (2022):

```
invDx = 1 / dx,  invDy = 1 / dy
t1x = (minX - ox) * invDx,  t2x = (maxX - ox) * invDx
t1y = (minY - oy) * invDy,  t2y = (maxY - oy) * invDy
tmin = max(min(t1x, t2x), min(t1y, t2y))
tmax = min(max(t1x, t2x), max(t1y, t2y))
return tmax >= 0 && tmin <= tmax && tmin <= 1
```

- `tmin <= 1` constrains to finite segment, not infinite ray.
- IEEE 754 semantics handle axis-aligned segments (1/0 = Infinity).
- Zero-length segments (stationary cursor) return false.

## Point-to-AABB Distance

Clamped nearest-edge:

```
dx = max(rect.left - px, 0, px - rect.right)
dy = max(rect.top - py, 0, py - rect.bottom)
distance = hypot(dx, dy)
```

Returns 0 when point is inside or on edge.

## Confidence Scoring (Temporal Stability)

```
if isIntersecting: consecutiveHitFrames++
else:              consecutiveHitFrames = 0

confidence = min(1, consecutiveHitFrames / CONFIDENCE_SATURATION_FRAMES)
```

Reaches 1.0 after 10 consecutive intersecting frames (~167ms at 60fps).

## CircularBuffer

Fixed-capacity ring buffer. O(1) `add`, `getLast`, `getFirst`. Pre-allocated backing array — zero allocations in hot path.
