import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTrajectory } from './useTrajectory.js'

describe('useTrajectory', () => {
  it('returns register, useSnapshot, getSnapshot, and trigger', () => {
    const { result } = renderHook(() => useTrajectory())
    expect(result.current.register).toBeDefined()
    expect(result.current.useSnapshot).toBeDefined()
    expect(result.current.getSnapshot).toBeDefined()
    expect(result.current.trigger).toBeDefined()
  })

  it('register returns a ref callback function', () => {
    const { result } = renderHook(() => useTrajectory())
    const ref = result.current.register('test', {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })
    expect(typeof ref).toBe('function')
  })

  it('getSnapshot returns undefined for unregistered element', () => {
    const { result } = renderHook(() => useTrajectory())
    expect(result.current.getSnapshot('nonexistent')).toBeUndefined()
  })

  it('is SSR safe — does not crash without DOM interactions', () => {
    const { result } = renderHook(() => useTrajectory())
    expect(result.current).toBeDefined()
  })

  it('accepts engine options', () => {
    const { result } = renderHook(() => useTrajectory({ predictionWindow: 200 }))
    expect(result.current).toBeDefined()
  })

  it('register with convenience config (whenApproaching)', () => {
    const { result } = renderHook(() => useTrajectory())
    const ref = result.current.register('test', {
      whenApproaching: () => {},
      tolerance: 20,
    })
    expect(typeof ref).toBe('function')
  })

  it('ref callback handles null (cleanup)', () => {
    const { result } = renderHook(() => useTrajectory())
    const ref = result.current.register('test', {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })

    const el = document.createElement('div')
    ref(el)
    ref(null)
    expect(result.current.getSnapshot('test')).toBeUndefined()
  })
})
