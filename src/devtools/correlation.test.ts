import { describe, it, expect, vi } from 'vitest'
import { ClickCorrelator, NavigationCorrelator } from './correlation.js'
import type { PredictionRecord } from './types.js'

describe('ClickCorrelator', () => {
  it('confirms prediction when element is clicked within window', () => {
    const onConfirm = vi.fn()
    const onMiss = vi.fn()
    const correlator = new ClickCorrelator({
      confirmationWindowMs: 2000,
      onConfirm,
      onMiss,
    })

    const prediction: PredictionRecord = {
      elementId: 'btn',
      timestamp: 100,
      confidence: 0.8,
      sourceUrl: '/',
    }
    correlator.recordPrediction(prediction)
    correlator.handleClick('btn', 500)

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        elementId: 'btn',
        leadTimeMs: 400,
        confirmationType: 'click',
      })
    )
  })

  it('does not confirm when click is outside window', () => {
    const onConfirm = vi.fn()
    const correlator = new ClickCorrelator({
      confirmationWindowMs: 500,
      onConfirm,
      onMiss: vi.fn(),
    })

    correlator.recordPrediction({
      elementId: 'btn',
      timestamp: 100,
      confidence: 0.8,
      sourceUrl: '/',
    })

    correlator.handleClick('btn', 700)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('reports missed navigation for untracked element click', () => {
    const onMiss = vi.fn()
    const correlator = new ClickCorrelator({
      confirmationWindowMs: 2000,
      onConfirm: vi.fn(),
      onMiss,
    })

    correlator.handleClick('other-btn', 500)
    expect(onMiss).toHaveBeenCalledOnce()
    expect(onMiss).toHaveBeenCalledWith('other-btn')
  })

  it('uses most recent prediction when multiple exist', () => {
    const onConfirm = vi.fn()
    const correlator = new ClickCorrelator({
      confirmationWindowMs: 2000,
      onConfirm,
      onMiss: vi.fn(),
    })

    correlator.recordPrediction({ elementId: 'btn', timestamp: 100, confidence: 0.5, sourceUrl: '/' })
    correlator.recordPrediction({ elementId: 'btn', timestamp: 300, confidence: 0.9, sourceUrl: '/' })

    correlator.handleClick('btn', 500)
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ leadTimeMs: 200 })
    )
  })

  it('expirePending removes old predictions', () => {
    const onConfirm = vi.fn()
    const correlator = new ClickCorrelator({
      confirmationWindowMs: 500,
      onConfirm,
      onMiss: vi.fn(),
    })

    correlator.recordPrediction({ elementId: 'btn', timestamp: 100, confidence: 0.8, sourceUrl: '/' })

    const expired = correlator.expirePending(700)
    expect(expired).toHaveLength(1)
    expect(expired[0].elementId).toBe('btn')

    correlator.handleClick('btn', 800)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('NavigationCorrelator', () => {
  it('confirms prediction from previous page on load', () => {
    const onConfirm = vi.fn()
    const correlator = new NavigationCorrelator({
      confirmationWindowMs: 2000,
      onConfirm,
    })

    const pendingPredictions = [
      { elementId: 'checkout', timestamp: 100, confidence: 0.9, sourceUrl: '/cart' },
    ]

    correlator.checkPendingOnLoad(pendingPredictions, '/checkout', 400)

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        elementId: 'checkout',
        leadTimeMs: 300,
        confirmationType: 'navigation',
      })
    )
  })

  it('does not confirm if URL does not match elementId', () => {
    const onConfirm = vi.fn()
    const correlator = new NavigationCorrelator({
      confirmationWindowMs: 2000,
      onConfirm,
    })

    const pendingPredictions = [
      { elementId: 'settings', timestamp: 100, confidence: 0.9, sourceUrl: '/dashboard' },
    ]

    correlator.checkPendingOnLoad(pendingPredictions, '/unrelated-page', 400)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('respects confirmation window', () => {
    const onConfirm = vi.fn()
    const correlator = new NavigationCorrelator({
      confirmationWindowMs: 500,
      onConfirm,
    })

    const pendingPredictions = [
      { elementId: 'checkout', timestamp: 100, confidence: 0.9, sourceUrl: '/cart' },
    ]

    correlator.checkPendingOnLoad(pendingPredictions, '/checkout', 700)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
