import { describe, it, expect, vi } from 'vitest'
import { DevEventEmitter } from './events.js'

describe('DevEventEmitter', () => {
  it('emits events to registered listeners', () => {
    const emitter = new DevEventEmitter()
    const listener = vi.fn()
    emitter.on('prediction:fired', listener)

    const event = {
      elementId: 'btn',
      timestamp: 100,
      confidence: 0.8,
      predictedPoint: { x: 150, y: 150 },
    }
    emitter.emit('prediction:fired', event)

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(event)
  })

  it('returns unsubscribe function', () => {
    const emitter = new DevEventEmitter()
    const listener = vi.fn()
    const unsub = emitter.on('prediction:fired', listener)

    unsub()
    emitter.emit('prediction:fired', {
      elementId: 'btn', timestamp: 100, confidence: 0.8,
      predictedPoint: { x: 0, y: 0 },
    })

    expect(listener).not.toHaveBeenCalled()
  })

  it('supports multiple listeners per event', () => {
    const emitter = new DevEventEmitter()
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    emitter.on('prediction:fired', listener1)
    emitter.on('prediction:fired', listener2)

    emitter.emit('prediction:fired', {
      elementId: 'btn', timestamp: 100, confidence: 0.8,
      predictedPoint: { x: 0, y: 0 },
    })

    expect(listener1).toHaveBeenCalledOnce()
    expect(listener2).toHaveBeenCalledOnce()
  })

  it('hasListeners returns false when no listeners', () => {
    const emitter = new DevEventEmitter()
    expect(emitter.hasListeners()).toBe(false)
  })

  it('hasListeners returns true when listeners exist', () => {
    const emitter = new DevEventEmitter()
    emitter.on('prediction:fired', () => {})
    expect(emitter.hasListeners()).toBe(true)
  })

  it('hasListeners returns false after all unsubscribed', () => {
    const emitter = new DevEventEmitter()
    const unsub = emitter.on('prediction:fired', () => {})
    unsub()
    expect(emitter.hasListeners()).toBe(false)
  })

  it('isolates listener errors — does not throw', () => {
    const emitter = new DevEventEmitter()
    const badListener = vi.fn(() => { throw new Error('boom') })
    const goodListener = vi.fn()
    emitter.on('prediction:fired', badListener)
    emitter.on('prediction:fired', goodListener)

    expect(() => {
      emitter.emit('prediction:fired', {
        elementId: 'btn', timestamp: 100, confidence: 0.8,
        predictedPoint: { x: 0, y: 0 },
      })
    }).not.toThrow()

    expect(goodListener).toHaveBeenCalledOnce()
  })

  it('removeAll clears all listeners', () => {
    const emitter = new DevEventEmitter()
    const listener = vi.fn()
    emitter.on('prediction:fired', listener)
    emitter.on('prediction:callback-start', listener)
    emitter.removeAll()
    expect(emitter.hasListeners()).toBe(false)
  })
})
