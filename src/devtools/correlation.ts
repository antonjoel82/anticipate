import type { PredictionRecord, ConfirmationRecord } from './types.js'

type ClickCorrelatorOptions = {
  confirmationWindowMs: number
  onConfirm: (record: ConfirmationRecord) => void
  onMiss: (elementId: string) => void
}

export class ClickCorrelator {
  private readonly pending: PredictionRecord[] = []
  private readonly options: ClickCorrelatorOptions

  constructor(options: ClickCorrelatorOptions) {
    this.options = options
  }

  recordPrediction(prediction: PredictionRecord): void {
    this.pending.push(prediction)
  }

  handleClick(elementId: string, clickTimestamp: number): void {
    let bestMatch: PredictionRecord | null = null

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const pred = this.pending[i]
      if (pred.elementId !== elementId) continue
      const elapsed = clickTimestamp - pred.timestamp
      if (elapsed >= 0 && elapsed <= this.options.confirmationWindowMs) {
        bestMatch = pred
        break
      }
    }

    if (bestMatch) {
      this.removePrediction(bestMatch)
      this.options.onConfirm({
        elementId,
        predictionTimestamp: bestMatch.timestamp,
        confirmationTimestamp: clickTimestamp,
        leadTimeMs: clickTimestamp - bestMatch.timestamp,
        sourceUrl: bestMatch.sourceUrl,
        confirmationType: 'click',
      })
      return
    }

    this.options.onMiss(elementId)
  }

  expirePending(now: number): PredictionRecord[] {
    const expired: PredictionRecord[] = []
    const remaining: PredictionRecord[] = []

    for (const pred of this.pending) {
      if (now - pred.timestamp > this.options.confirmationWindowMs) {
        expired.push(pred)
      } else {
        remaining.push(pred)
      }
    }

    this.pending.length = 0
    this.pending.push(...remaining)
    return expired
  }

  private removePrediction(target: PredictionRecord): void {
    const idx = this.pending.indexOf(target)
    if (idx !== -1) this.pending.splice(idx, 1)
  }
}

type NavigationCorrelatorOptions = {
  confirmationWindowMs: number
  onConfirm: (record: ConfirmationRecord) => void
}

export class NavigationCorrelator {
  private readonly options: NavigationCorrelatorOptions

  constructor(options: NavigationCorrelatorOptions) {
    this.options = options
  }

  checkPendingOnLoad(
    pendingPredictions: PredictionRecord[],
    currentUrl: string,
    loadTimestamp: number,
  ): void {
    const pathSegment = currentUrl.split('/').filter(Boolean).pop() ?? ''

    for (let i = pendingPredictions.length - 1; i >= 0; i--) {
      const pred = pendingPredictions[i]
      const elapsed = loadTimestamp - pred.timestamp
      if (elapsed < 0 || elapsed > this.options.confirmationWindowMs) continue

      const elementIdMatches = pred.elementId === pathSegment
        || pred.elementId.toLowerCase().includes(pathSegment.toLowerCase())
        || pathSegment.toLowerCase().includes(pred.elementId.toLowerCase())

      if (elementIdMatches && pred.sourceUrl !== currentUrl) {
        this.options.onConfirm({
          elementId: pred.elementId,
          predictionTimestamp: pred.timestamp,
          confirmationTimestamp: loadTimestamp,
          leadTimeMs: elapsed,
          sourceUrl: pred.sourceUrl,
          confirmationType: 'navigation',
        })
        return
      }
    }
  }
}
