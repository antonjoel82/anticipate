import { describe, it, expect, vi } from 'vitest'
import { TrajectoryEngine } from './engine.js'

describe('TrajectoryEngine integration', () => {
  it('cleanup: unregister removes snapshot and notifies', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')
    const subscriber = vi.fn()

    engine.register('btn', el, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })

    engine.subscribe(subscriber)
    engine.unregister('btn')

    expect(engine.getSnapshot('btn')).toBeUndefined()
    expect(engine.getAllSnapshots().size).toBe(0)
    expect(subscriber).toHaveBeenCalled()
    engine.destroy()
  })

  it('multiple elements have independent registrations', () => {
    const engine = new TrajectoryEngine()
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')

    engine.register('a', el1, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })
    engine.register('b', el2, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })

    engine.unregister('a')
    expect(engine.getSnapshot('a')).toBeUndefined()

    engine.trigger('b')
    engine.destroy()
  })

  it('per-element subscriptions fire independently', () => {
    const engine = new TrajectoryEngine()
    const el1 = document.createElement('div')
    const el2 = document.createElement('div')
    const subA = vi.fn()
    const subB = vi.fn()

    engine.register('a', el1, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })
    engine.register('b', el2, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })

    const unsubA = engine.subscribeToElement('a')(subA)
    engine.subscribeToElement('b')(subB)

    engine.unregister('a')
    expect(subA).toHaveBeenCalled()
    expect(subB).not.toHaveBeenCalled()

    unsubA()
    engine.destroy()
  })

  it('imperative trigger with callback error does not crash engine', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')

    engine.register('test', el, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => { throw new Error('callback error') },
      profile: { type: 'on_enter' },
    })

    expect(() => engine.trigger('test')).not.toThrow()
    engine.destroy()
  })

  it('imperative trigger with async callback error does not crash engine', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')

    engine.register('test', el, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: async () => { throw new Error('async error') },
      profile: { type: 'on_enter' },
    })

    expect(() => engine.trigger('test')).not.toThrow()
    engine.destroy()
  })

  it('convenience config works through imperative trigger', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')
    const cb = vi.fn()

    engine.register('nav', el, {
      whenApproaching: cb,
      tolerance: 10,
    })

    engine.trigger('nav')
    expect(cb).toHaveBeenCalledOnce()
    engine.destroy()
  })

  it('destroy after unregister all elements is clean', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')

    engine.register('a', el, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'once' },
    })

    engine.connect()
    engine.unregister('a')
    engine.disconnect()

    expect(() => engine.destroy()).not.toThrow()
    expect(engine.getAllSnapshots().size).toBe(0)
  })
})
