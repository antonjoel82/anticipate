import { describe, it, expect } from 'vitest'
import { createElementState, shouldFire, updateElementState } from './triggers.js'

describe('trigger profile: once', () => {
  it('fires on first trigger', () => {
    const state = createElementState()
    expect(shouldFire({ type: 'once' }, state, true, 0)).toBe(true)
  })

  it('never fires again after first trigger', () => {
    const state = createElementState()
    updateElementState(state, true, 0, true)
    expect(shouldFire({ type: 'once' }, state, true, 16)).toBe(false)
  })

  it('does not fire when not triggered', () => {
    const state = createElementState()
    expect(shouldFire({ type: 'once' }, state, false, 0)).toBe(false)
  })
})

describe('trigger profile: on_enter', () => {
  it('fires on false-to-true transition', () => {
    const state = createElementState()
    expect(shouldFire({ type: 'on_enter' }, state, true, 0)).toBe(true)
  })

  it('does not fire while staying triggered', () => {
    const state = createElementState()
    state.wasTriggeredLastFrame = true
    expect(shouldFire({ type: 'on_enter' }, state, true, 16)).toBe(false)
  })

  it('fires again after leaving and re-entering', () => {
    const state = createElementState()
    expect(shouldFire({ type: 'on_enter' }, state, true, 0)).toBe(true)
    updateElementState(state, true, 0, true)
    expect(shouldFire({ type: 'on_enter' }, state, true, 16)).toBe(false)
    updateElementState(state, false, 16, false)
    expect(shouldFire({ type: 'on_enter' }, state, true, 32)).toBe(true)
  })

  it('does not fire when not triggered', () => {
    const state = createElementState()
    expect(shouldFire({ type: 'on_enter' }, state, false, 0)).toBe(false)
  })
})

describe('trigger profile: every_frame', () => {
  it('fires every frame while triggered', () => {
    const state = createElementState()
    expect(shouldFire({ type: 'every_frame' }, state, true, 0)).toBe(true)
    updateElementState(state, true, 0, true)
    expect(shouldFire({ type: 'every_frame' }, state, true, 16)).toBe(true)
  })

  it('does not fire when not triggered', () => {
    const state = createElementState()
    expect(shouldFire({ type: 'every_frame' }, state, false, 0)).toBe(false)
  })
})

describe('trigger profile: cooldown', () => {
  const profile = { type: 'cooldown' as const, intervalMs: 300 }

  it('fires on first enter', () => {
    const state = createElementState()
    expect(shouldFire(profile, state, true, 0)).toBe(true)
  })

  it('does not fire during cooldown period', () => {
    const state = createElementState()
    updateElementState(state, true, 100, true)
    updateElementState(state, false, 150, false)
    expect(shouldFire(profile, state, true, 200)).toBe(false)
  })

  it('fires after cooldown expires', () => {
    const state = createElementState()
    updateElementState(state, true, 100, true)
    updateElementState(state, false, 150, false)
    expect(shouldFire(profile, state, true, 500)).toBe(true)
  })

  it('does not fire while staying triggered', () => {
    const state = createElementState()
    updateElementState(state, true, 0, true)
    expect(shouldFire(profile, state, true, 500)).toBe(false)
  })
})

describe('updateElementState', () => {
  it('sets wasTriggeredLastFrame', () => {
    const state = createElementState()
    updateElementState(state, true, 0, false)
    expect(state.wasTriggeredLastFrame).toBe(true)
    updateElementState(state, false, 16, false)
    expect(state.wasTriggeredLastFrame).toBe(false)
  })

  it('sets hasFiredOnce when didFire is true', () => {
    const state = createElementState()
    expect(state.hasFiredOnce).toBe(false)
    updateElementState(state, true, 0, true)
    expect(state.hasFiredOnce).toBe(true)
  })

  it('updates lastFireTimestamp when didFire is true', () => {
    const state = createElementState()
    updateElementState(state, true, 42, true)
    expect(state.lastFireTimestamp).toBe(42)
  })

  it('does not update lastFireTimestamp when didFire is false', () => {
    const state = createElementState()
    updateElementState(state, true, 42, false)
    expect(state.lastFireTimestamp).toBe(-Infinity)
  })

})
