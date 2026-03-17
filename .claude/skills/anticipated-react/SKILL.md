---
name: anticipated-react
description: React hook for cursor trajectory prediction. Use when integrating useAnticipated into React components — registering elements via ref callbacks, subscribing to trajectory snapshots, building predictive UI like prefetch-on-approach or confidence-driven styling.
---

# Anticipated React Hook

`useAnticipated` — React wrapper for the anticipated trajectory prediction engine. Import from `anticipated/react`.

## Quick Start

```tsx
import { useAnticipated } from 'anticipated/react'

function PrefetchLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { register, useSnapshot } = useAnticipated()

  const ref = register('link', {
    whenApproaching: () => prefetch(href),
    tolerance: 20,
  })

  const snap = useSnapshot('link')

  return <a ref={ref} href={href} data-confidence={snap?.confidence}>{children}</a>
}
```

## Core Patterns

### Register Elements with Ref Callbacks

`register(id, config)` returns a stable `RefCallback<HTMLElement>`. Attach directly to JSX:

```tsx
const { register } = useAnticipated()

const ref = register('submit-btn', {
  whenApproaching: () => prevalidateForm(),
  tolerance: 30,
})

return <button ref={ref}>Submit</button>
```

Ref callbacks are cached per `id` — safe across re-renders without churn.

### Reactive Snapshots with useSnapshot

```tsx
const { register, useSnapshot } = useAnticipated()
const ref = register('card', { whenApproaching: () => {}, tolerance: 15 })
const snap = useSnapshot('card')

const glowIntensity: number = snap && snap.confidence > 0.5
  ? (snap.confidence - 0.5) * 2
  : 0

return (
  <div ref={ref} style={{
    boxShadow: glowIntensity > 0
      ? `0 0 ${glowIntensity * 20}px rgba(74, 222, 128, ${glowIntensity * 0.6})`
      : 'none',
  }}>
    Card content
  </div>
)
```

`useSnapshot` uses `useSyncExternalStore` — components only re-render when their specific element's snapshot changes.

### Multiple Elements from One Hook

Call `useAnticipated()` once, register many elements:

```tsx
function Nav() {
  const { register, useSnapshot } = useAnticipated({ predictionWindow: 150 })

  return (
    <nav>
      {items.map((item) => (
        <NavLink key={item.id} id={item.id} register={register} useSnapshot={useSnapshot} />
      ))}
    </nav>
  )
}

function NavLink({ id, register, useSnapshot }: NavLinkProps) {
  const ref = register(id, { whenApproaching: () => prefetch(id) })
  const snap = useSnapshot(id)
  return <a ref={ref}>{snap?.confidence.toFixed(2)}</a>
}
```

### Full Config with Custom Trigger Logic

```tsx
const ref = register('checkout', {
  triggerOn: (snap) => ({
    isTriggered: snap.isIntersecting && snap.confidence > 0.7,
    reason: 'trajectory',
  }),
  whenTriggered: () => preloadCheckoutBundle(),
  profile: { type: 'once' },
  tolerance: { top: 50, right: 30, bottom: 20, left: 30 },
})
```

### Imperative Trigger

```tsx
const { trigger } = useAnticipated()

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter') trigger('submit-btn')
}
```

## Key Rules

1. Call `useAnticipated()` once per component tree (or per engine instance).
2. Pass `register` and `useSnapshot` down as props — do not call `useAnticipated()` in child components (creates separate engines).
3. `useSnapshot(id)` is a hook — call unconditionally at component top level.
4. `register` returns stable ref callbacks. Do not wrap in `useCallback`.
5. Engine auto-connects on mount and auto-destroys on unmount.

## Hook Return Shape

```ts
type UseAnticipatedReturn = {
  register: (id: string, config: RegisterConfig) => RefCallback<HTMLElement>
  trigger: (id: string, options?: TriggerOptions) => void
  getSnapshot: (id: string) => TrajectorySnapshot | undefined  // non-reactive
  useSnapshot: (id: string) => TrajectorySnapshot | undefined  // reactive
}
```

## Advanced

- [references/patterns.md](references/patterns.md) — Prefetch, confidence styling, distance-based opacity, animation integration
