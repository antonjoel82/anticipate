import type { ElementState, TriggerProfile } from './types.js'

export function createElementState(): ElementState {
  return {
    wasTriggeredLastFrame: false,
    hasFiredOnce: false,
    lastFireTimestamp: -Infinity,
    consecutiveHitFrames: 0,
  }
}

export function shouldFire(
  profile: TriggerProfile,
  state: ElementState,
  isTriggered: boolean,
  now: number,
): boolean {
  if (!isTriggered) return false

  switch (profile.type) {
    case 'once':
      return !state.hasFiredOnce
    case 'on_enter':
      return !state.wasTriggeredLastFrame
    case 'every_frame':
      return true
    case 'cooldown':
      return !state.wasTriggeredLastFrame && (now - state.lastFireTimestamp >= profile.intervalMs)
  }
}

export function updateElementState(
  state: ElementState,
  isTriggered: boolean,
  now: number,
  didFire: boolean,
): void {
  state.wasTriggeredLastFrame = isTriggered

  if (didFire) {
    state.hasFiredOnce = true
    state.lastFireTimestamp = now
  }

}
