import { SESSION_STORAGE_KEY } from './constants.js'
import type { PersistedState, PredictionRecord, ConfirmationRecord, FlowStep, FlowReport } from './types.js'

function createEmptyState(): PersistedState {
  return {
    pendingPredictions: [],
    confirmations: [],
    currentFlowSteps: [],
    completedFlows: [],
    missedNavigations: 0,
    sessionStartedAt: Date.now(),
  }
}

export class SessionStore {
  private state: PersistedState
  private readonly maxEvents: number

  constructor(maxEvents: number) {
    this.maxEvents = maxEvents
    this.state = this.load()
  }

  getState(): PersistedState {
    return this.state
  }

  addPrediction(record: PredictionRecord): void {
    this.state.pendingPredictions.push(record)
    this.evict()
  }

  addConfirmation(record: ConfirmationRecord): void {
    this.state.confirmations.push(record)
    this.state.pendingPredictions = this.state.pendingPredictions.filter(
      (p) => !(p.elementId === record.elementId && p.timestamp === record.predictionTimestamp)
    )
  }

  addFlowStep(step: FlowStep): void {
    this.state.currentFlowSteps.push(step)
  }

  completeFlow(flow: FlowReport): void {
    this.state.completedFlows.push(flow)
    this.state.currentFlowSteps = []
  }

  incrementMissedNavigations(): void {
    this.state.missedNavigations++
  }

  flush(): void {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.state))
    } catch { }
  }

  clear(): void {
    this.state = createEmptyState()
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch { }
  }

  private load(): PersistedState {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (!raw) return createEmptyState()
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.pendingPredictions)) {
        return parsed as PersistedState
      }
      return createEmptyState()
    } catch {
      return createEmptyState()
    }
  }

  private evict(): void {
    if (this.state.pendingPredictions.length > this.maxEvents) {
      this.state.pendingPredictions = this.state.pendingPredictions.slice(-this.maxEvents)
    }
  }
}
