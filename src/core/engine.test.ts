import { describe, it, expect, vi, afterEach } from 'vitest'
import { TrajectoryEngine } from './engine.js'
import type { ElementConfig, TriggerProfile } from './types.js'

function makeConfig(overrides?: Partial<ElementConfig>): ElementConfig {
  return {
    triggerOn: () => ({ isTriggered: false }),
    whenTriggered: () => {},
    profile: { type: 'once' },
    ...overrides,
  }
}

describe('TrajectoryEngine lifecycle', () => {
  it('creates with default options', () => {
    const engine = new TrajectoryEngine()
    expect(engine).toBeDefined()
    engine.destroy()
  })

  it('creates with custom options', () => {
    const engine = new TrajectoryEngine({ predictionWindow: 200, bufferSize: 12 })
    expect(engine).toBeDefined()
    engine.destroy()
  })

  it('rejects invalid options', () => {
    expect(() => new TrajectoryEngine({ predictionWindow: 5 })).toThrow()
  })
})

describe('TrajectoryEngine registration', () => {
  it('registers and unregisters elements', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')

    engine.register('test', el, makeConfig())
    expect(engine.getSnapshot('test')).toBeUndefined()

    engine.unregister('test')
    expect(engine.getSnapshot('test')).toBeUndefined()
    engine.destroy()
  })

  it('re-register with same id updates config', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')
    const cb1 = vi.fn()
    const cb2 = vi.fn()

    engine.register('test', el, makeConfig({ whenTriggered: cb1 }))
    engine.register('test', el, makeConfig({ whenTriggered: cb2 }))

    engine.destroy()
  })

  it('unregistering unknown id is a no-op', () => {
    const engine = new TrajectoryEngine()
    expect(() => engine.unregister('nonexistent')).not.toThrow()
    engine.destroy()
  })
})

describe('TrajectoryEngine subscriptions', () => {
  it('subscribe returns unsubscribe function', () => {
    const engine = new TrajectoryEngine()
    const cb = vi.fn()
    const unsubscribe = engine.subscribe(cb)
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
    engine.destroy()
  })

  it('subscribeToElement returns factory function', () => {
    const engine = new TrajectoryEngine()
    const factory = engine.subscribeToElement('test')
    expect(typeof factory).toBe('function')
    const unsubscribe = factory(() => {})
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
    engine.destroy()
  })

  it('getAllSnapshots returns empty map initially', () => {
    const engine = new TrajectoryEngine()
    const snapshots = engine.getAllSnapshots()
    expect(snapshots.size).toBe(0)
    engine.destroy()
  })
})

describe('TrajectoryEngine imperative trigger', () => {
  it('fires whenTriggered callback', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')
    const cb = vi.fn()
    engine.register('test', el, makeConfig({
      whenTriggered: cb,
      profile: { type: 'on_enter' },
    }))

    engine.trigger('test')
    expect(cb).toHaveBeenCalledOnce()
    engine.destroy()
  })

  it('respects once profile — does not re-fire', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')
    const cb = vi.fn()
    engine.register('test', el, makeConfig({
      whenTriggered: cb,
      profile: { type: 'once' },
    }))

    engine.trigger('test')
    engine.trigger('test')
    expect(cb).toHaveBeenCalledOnce()
    engine.destroy()
  })

  it('dangerouslyIgnoreProfile bypasses once', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')
    const cb = vi.fn()
    engine.register('test', el, makeConfig({
      whenTriggered: cb,
      profile: { type: 'once' },
    }))

    engine.trigger('test')
    engine.trigger('test', { dangerouslyIgnoreProfile: true })
    expect(cb).toHaveBeenCalledTimes(2)
    engine.destroy()
  })

  it('throws on unknown element id', () => {
    const engine = new TrajectoryEngine()
    expect(() => engine.trigger('nonexistent')).toThrow()
    engine.destroy()
  })
})

describe('TrajectoryEngine connect/disconnect', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('connect adds event listener', () => {
    const engine = new TrajectoryEngine()
    const addSpy = vi.spyOn(document, 'addEventListener')
    engine.connect()
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    engine.disconnect()
    engine.destroy()
  })

  it('disconnect removes event listener', () => {
    const engine = new TrajectoryEngine()
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    engine.connect()
    engine.disconnect()
    expect(removeSpy).toHaveBeenCalled()
    engine.destroy()
  })

  it('destroy fully tears down without throwing', () => {
    const engine = new TrajectoryEngine()
    engine.connect()
    engine.destroy()
    expect(() => engine.destroy()).not.toThrow()
  })

  it('double connect does not add duplicate listeners', () => {
    const engine = new TrajectoryEngine()
    const addSpy = vi.spyOn(document, 'addEventListener')
    engine.connect()
    engine.connect()
    const pointerMoveCallCount = addSpy.mock.calls.filter(
      (call) => call[0] === 'pointermove'
    ).length
    expect(pointerMoveCallCount).toBe(1)
    engine.disconnect()
    engine.destroy()
  })
})

describe('TrajectoryEngine convenience config', () => {
  it('expands whenApproaching to full config', () => {
    const engine = new TrajectoryEngine()
    const el = document.createElement('div')
    const cb = vi.fn()

    engine.register('test', el, {
      whenApproaching: cb,
      tolerance: 20,
    } as unknown as ElementConfig)

    engine.trigger('test')
    expect(cb).toHaveBeenCalledOnce()
    engine.destroy()
  })
})
