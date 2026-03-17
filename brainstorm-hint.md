# useAnticipated — Brainstorm Hint

## What We're Building

A React hook (`useAnticipated` or similar) in TypeScript that predicts cursor intent using ray-AABB intersection (the slab method from `geofence.html`). You register DOM elements, and the hook continuously computes trajectory snapshots for each one based on mouse movement.

## Core Mechanics

- **Ray casting**: On each mousemove, cast a ray from the previous cursor position through the current position. Test intersection against each registered element's bounding box.
- **Snapshot per element**: Each registered element gets a snapshot containing:
  - `isIntersecting` — is the trajectory ray currently hitting the element's AABB
  - `distancePx` — distance in pixels from cursor to the element
  - `velocity` — cursor velocity (requires tracking previous position/timestamp)
- **Velocity tracking**: The hook maintains previous cursor position and timestamp internally to derive velocity vector and magnitude.
- **Configurable debounce**: A debounce period on the mousemove handler, configurable at the hook level.

## Per-Element Config

Each registered element accepts a config object with:

- **`triggerOn`** — a function that receives the element's snapshot and returns `{ isTriggered: boolean; reason?: "distance" | "direction" | "magnitude" | ... }`. This is the user-defined predicate — they decide what combination of snapshot data constitutes a "trigger."
- **`whenTriggered`** — a callback invoked when `isTriggered` becomes true.
- **Trigger profile** — controls *how* `whenTriggered` fires:
  - `"once"` — fire once, never again
  - `"on_enter"` — fire each time isTriggered transitions false → true
  - `"every_frame"` — fire every mousemove while triggered
  - `"cooldown"` — like on_enter but with a minimum interval between fires
  - (exact set TBD)
- Profile is **per-element** (part of the config object).

## Registration Model

- **Ref-based** (React-idiomatic): the hook returns a `register` function that produces a ref you attach to elements.

## Open Questions

1. **Distance calculation** — distance from cursor to what exactly? Nearest edge of the bounding box? Center of the element? Nearest corner?

2. **Velocity shape** — should velocity be a full vector `{ x, y, magnitude, angle }` or just scalar magnitude? Angle would let `triggerOn` reason about direction.

3. **Rect caching** — should `getBoundingClientRect()` be cached and only refreshed on resize/scroll? (Performance win, but adds complexity.)

4. **Cleanup behavior** — when a registered element unmounts, should its snapshot disappear from the map immediately, or linger for one frame?

5. **SSR safety** — does this need to be SSR-safe (no `document` access during render)? Given TanStack Start, likely yes.

6. **Return shape** — should the hook return just the `register` function, or also expose the full snapshot map for reading in render (e.g. to change styles based on trajectory)?

7. **Event target** — should the mousemove listener attach to `document`, `window`, or a configurable container element?

8. **Multiple hooks** — if two instances of the hook exist on the same page, should they share a single mousemove listener (singleton pattern) or each maintain their own?

9. **`triggerOn` reason strings** — should these be a fixed union type, or freeform strings the consumer defines?

10. **Debounce vs throttle** — debounce delays until movement stops; throttle limits frequency but still fires during movement. For trajectory prediction, throttle (or `requestAnimationFrame`) is probably more appropriate. Which did you mean?

11. **Where does this live?** — `apps/web/src/lib/`, a new `hooks/` directory, or a standalone package?

## Reference

- `geofence.html` in project root — the original slab-method prototype
