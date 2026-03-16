import type { TrajectoryEngine } from '../core/engine.js'
import type {
  ProfilerOptions,
  ProfilerReport,
  FlowReport,
  PredictionRecord,
  ConfirmationRecord,
} from './types.js'
import { DEFAULT_CONFIRMATION_WINDOW_MS, DEFAULT_MAX_EVENTS_STORED } from './constants.js'
import { SessionStore } from './session-store.js'
import { ClickCorrelator } from './correlation.js'
import { computeReport } from './metrics.js'

export class ForeseeProfiler {
  private readonly engine: TrajectoryEngine
  private readonly store: SessionStore
  private readonly clickCorrelator: ClickCorrelator
  private readonly confirmationWindowMs: number
  private readonly persistAcrossNavigations: boolean
  private readonly unsubscribers: Array<() => void> = []
  private isDestroyed = false

  constructor(engine: TrajectoryEngine, options?: ProfilerOptions) {
    this.engine = engine
    this.confirmationWindowMs = options?.confirmationWindowMs ?? DEFAULT_CONFIRMATION_WINDOW_MS
    this.persistAcrossNavigations = options?.persistAcrossNavigations ?? true
    const maxEvents = options?.maxEventsStored ?? DEFAULT_MAX_EVENTS_STORED

    this.store = new SessionStore(maxEvents)

    this.clickCorrelator = new ClickCorrelator({
      confirmationWindowMs: this.confirmationWindowMs,
      onConfirm: (record) => this.handleConfirmation(record),
      onMiss: (_elementId) => this.store.incrementMissedNavigations(),
    })

    this.attachEngineListeners()
  }

  getReport(): ProfilerReport {
    return computeReport(this.store.getState())
  }

  getFlows(): FlowReport[] {
    return [...this.store.getState().completedFlows]
  }

  confirmNavigation(elementId: string): void {
    const state = this.store.getState()
    const prediction = [...state.pendingPredictions]
      .reverse()
      .find((p) => p.elementId === elementId)

    if (!prediction) return

    const now = performance.now()
    this.handleConfirmation({
      elementId,
      predictionTimestamp: prediction.timestamp,
      confirmationTimestamp: now,
      leadTimeMs: now - prediction.timestamp,
      sourceUrl: prediction.sourceUrl,
      confirmationType: 'manual',
    })
  }

  reset(): void {
    this.store.clear()
  }

  destroy(): void {
    if (this.isDestroyed) return
    for (const unsub of this.unsubscribers) {
      unsub()
    }
    this.unsubscribers.length = 0
    if (this.persistAcrossNavigations) {
      this.store.flush()
    }
    this.isDestroyed = true
  }

  private attachEngineListeners(): void {
    const unsubFired = this.engine.onDev('prediction:fired', (event) => {
      const record: PredictionRecord = {
        elementId: event.elementId,
        timestamp: event.timestamp,
        confidence: event.confidence,
        sourceUrl: typeof location !== 'undefined' ? location.pathname : '/',
      }
      this.store.addPrediction(record)
      this.clickCorrelator.recordPrediction(record)
    })

    const unsubEnd = this.engine.onDev('prediction:callback-end', (event) => {
      const state = this.store.getState()
      const pred = state.pendingPredictions.find(
        (p) => p.elementId === event.elementId
      )
      if (pred) {
        pred.callbackDurationMs = event.durationMs
        pred.status = event.status
      }
    })

    this.unsubscribers.push(unsubFired, unsubEnd)
  }

  private handleConfirmation(record: ConfirmationRecord): void {
    this.store.addConfirmation(record)
    if (this.persistAcrossNavigations) {
      this.store.flush()
    }
  }
}
