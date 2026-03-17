# React Integration Patterns

## Prefetch on Approach

Prefetch data when the cursor heads toward a navigation link:

```tsx
function NavItem({ href, label }: { href: string; label: string }) {
  const { register } = useAnticipated()

  const ref = register(`nav-${href}`, {
    whenApproaching: () => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = href
      document.head.appendChild(link)
    },
    tolerance: 25,
  })

  return <a ref={ref} href={href}>{label}</a>
}
```

With React Query:

```tsx
const ref = register('user-profile', {
  whenApproaching: () => queryClient.prefetchQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  }),
})
```

## Confidence-Driven Glow

Progressive green glow as confidence exceeds a threshold:

```tsx
const GLOW_THRESHOLD = 0.5

function GlowButton({ id, label }: { id: string; label: string }) {
  const { register, useSnapshot } = useAnticipated()
  const ref = register(id, { whenApproaching: () => {}, tolerance: 30 })
  const snap = useSnapshot(id)

  const intensity: number = snap && snap.confidence > GLOW_THRESHOLD
    ? (snap.confidence - GLOW_THRESHOLD) / (1 - GLOW_THRESHOLD)
    : 0

  return (
    <button
      ref={ref}
      style={{
        borderColor: `rgba(74, 222, 128, ${intensity})`,
        boxShadow: intensity > 0
          ? `0 0 ${intensity * 24}px rgba(74, 222, 128, ${intensity * 0.5})`
          : 'none',
        transition: intensity > 0 ? 'all 0.08s' : 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
```

## Distance-Based Opacity

Fade elements in as cursor gets closer:

```tsx
function ProximityCard({ id }: { id: string }) {
  const { register, useSnapshot } = useAnticipated()
  const ref = register(id, {
    triggerOn: () => ({ isTriggered: false }),
    whenTriggered: () => {},
    profile: { type: 'every_frame' },
  })
  const snap = useSnapshot(id)

  const maxDistance = 500
  const opacity: number = snap
    ? Math.max(0.3, 1 - snap.distancePx / maxDistance)
    : 0.3

  return <div ref={ref} style={{ opacity }}>{id}</div>
}
```

## Velocity-Based Animation

Speed up animation when cursor moves fast toward an element:

```tsx
function VelocityDot({ id }: { id: string }) {
  const { register, useSnapshot } = useAnticipated()
  const ref = register(id, {
    triggerOn: (snap) => ({ isTriggered: snap.velocity.magnitude > 100 }),
    whenTriggered: () => {},
    profile: { type: 'every_frame' },
  })
  const snap = useSnapshot(id)

  const speed: number = snap?.velocity.magnitude ?? 0
  const scale: number = 1 + Math.min(speed / 1000, 0.5)

  return <div ref={ref} style={{ transform: `scale(${scale})` }} />
}
```

## Shared Engine Across Component Tree

Pass `register` and `useSnapshot` through context or props:

```tsx
const TrajectoryContext = createContext<UseAnticipatedReturn | null>(null)

function TrajectoryProvider({ children }: { children: React.ReactNode }) {
  const trajectory = useAnticipated({ predictionWindow: 150 })
  return (
    <TrajectoryContext.Provider value={trajectory}>
      {children}
    </TrajectoryContext.Provider>
  )
}

function useSharedTrajectory(): UseAnticipatedReturn {
  const ctx = useContext(TrajectoryContext)
  if (!ctx) throw new Error('Missing TrajectoryProvider')
  return ctx
}
```

## SSR Safety

`useAnticipated` is SSR-safe. The engine is only created when `typeof window !== 'undefined'`. On the server:

- `register()` returns a no-op ref callback
- `useSnapshot()` returns `undefined`
- `getSnapshot()` returns `undefined`
- No event listeners are attached

No `useEffect` guard needed — works out of the box with Next.js, Remix, etc.

## Testing Components

Mock the hook in tests:

```tsx
import { vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('anticipated/react', () => ({
  useAnticipated: () => ({
    register: () => () => {},
    useSnapshot: () => ({ isIntersecting: true, confidence: 0.8, distancePx: 50, velocity: { x: 0, y: 0, magnitude: 0, angle: 0 }, predictedPoint: { x: 0, y: 0 } }),
    getSnapshot: () => undefined,
    trigger: () => {},
  }),
}))
```
