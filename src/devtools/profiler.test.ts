import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForeseeProfiler } from './profiler.js'
import { TrajectoryEngine } from '../core/engine.js'

describe('ForeseeProfiler', () => {
  let engine: TrajectoryEngine

  beforeEach(() => {
    sessionStorage.clear()
    engine = new TrajectoryEngine()
  })

  it('creates with default options', () => {
    const profiler = new ForeseeProfiler(engine)
    expect(profiler).toBeDefined()
    profiler.destroy()
  })

  it('creates with custom options', () => {
    const profiler = new ForeseeProfiler(engine, {
      confirmationWindowMs: 3000,
      persistAcrossNavigations: false,
      maxEventsStored: 100,
    })
    expect(profiler).toBeDefined()
    profiler.destroy()
  })

  it('getReport returns empty report initially', () => {
    const profiler = new ForeseeProfiler(engine)
    const report = profiler.getReport()
    expect(report.predictions).toBe(0)
    expect(report.confirmed).toBe(0)
    expect(report.precision).toBe(0)
    expect(report.flows).toEqual([])
    profiler.destroy()
  })

  it('confirmNavigation manually confirms a prediction', () => {
    const profiler = new ForeseeProfiler(engine)

    const el = document.createElement('div')
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 100, right: 200, bottom: 200,
      width: 100, height: 100, x: 100, y: 100, toJSON: () => {},
    })

    engine.register('nav-settings', el, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: vi.fn(),
      profile: { type: 'on_enter' },
    })

    engine.trigger('nav-settings')
    profiler.confirmNavigation('nav-settings')

    const report = profiler.getReport()
    expect(report.confirmed).toBe(1)
    expect(report.avgLeadTimeMs).toBeGreaterThanOrEqual(0)
    profiler.destroy()
  })

  it('reset clears all data', () => {
    const profiler = new ForeseeProfiler(engine)
    const el = document.createElement('div')
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 100, right: 200, bottom: 200,
      width: 100, height: 100, x: 100, y: 100, toJSON: () => {},
    })

    engine.register('btn', el, {
      triggerOn: () => ({ isTriggered: false }),
      whenTriggered: () => {},
      profile: { type: 'on_enter' },
    })
    engine.trigger('btn')
    profiler.confirmNavigation('btn')

    profiler.reset()
    const report = profiler.getReport()
    expect(report.predictions).toBe(0)
    expect(report.confirmed).toBe(0)
    profiler.destroy()
  })

  it('destroy unsubscribes from engine', () => {
    const profiler = new ForeseeProfiler(engine)
    profiler.destroy()
    expect(() => profiler.destroy()).not.toThrow()
  })

  it('getFlows returns flow reports', () => {
    const profiler = new ForeseeProfiler(engine)
    const flows = profiler.getFlows()
    expect(flows).toEqual([])
    profiler.destroy()
  })
})
