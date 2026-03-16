import { describe, it, expect, beforeEach } from 'vitest'
import { SessionStore } from './session-store.js'
import { SESSION_STORAGE_KEY } from './constants.js'
import type { PredictionRecord } from './types.js'

describe('SessionStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('initializes with empty state when no stored data', () => {
    const store = new SessionStore(500)
    const state = store.getState()
    expect(state.pendingPredictions).toEqual([])
    expect(state.confirmations).toEqual([])
    expect(state.completedFlows).toEqual([])
    expect(state.missedNavigations).toBe(0)
  })

  it('persists and restores predictions', () => {
    const store = new SessionStore(500)
    const prediction: PredictionRecord = {
      elementId: 'btn',
      timestamp: 100,
      confidence: 0.8,
      sourceUrl: '/page-a',
    }
    store.addPrediction(prediction)
    store.flush()

    const store2 = new SessionStore(500)
    const state = store2.getState()
    expect(state.pendingPredictions).toHaveLength(1)
    expect(state.pendingPredictions[0].elementId).toBe('btn')
  })

  it('evicts oldest predictions when max exceeded', () => {
    const store = new SessionStore(3)
    for (let i = 0; i < 5; i++) {
      store.addPrediction({
        elementId: `btn-${i}`,
        timestamp: i * 100,
        confidence: 0.8,
        sourceUrl: '/test',
      })
    }
    store.flush()

    const store2 = new SessionStore(3)
    const state = store2.getState()
    expect(state.pendingPredictions).toHaveLength(3)
    expect(state.pendingPredictions[0].elementId).toBe('btn-2')
  })

  it('handles corrupted sessionStorage gracefully', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'not valid json{{{')
    const store = new SessionStore(500)
    const state = store.getState()
    expect(state.pendingPredictions).toEqual([])
  })

  it('handles sessionStorage unavailable gracefully', () => {
    const originalGetItem = sessionStorage.getItem
    sessionStorage.getItem = () => { throw new Error('quota exceeded') }

    const store = new SessionStore(500)
    const state = store.getState()
    expect(state.pendingPredictions).toEqual([])

    sessionStorage.getItem = originalGetItem
  })

  it('clear removes all stored data', () => {
    const store = new SessionStore(500)
    store.addPrediction({
      elementId: 'btn',
      timestamp: 100,
      confidence: 0.8,
      sourceUrl: '/test',
    })
    store.flush()
    store.clear()

    const store2 = new SessionStore(500)
    expect(store2.getState().pendingPredictions).toEqual([])
  })
})
