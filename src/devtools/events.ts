import type { AnticipateDevEventMap } from './types.js'

type Listener<K extends keyof AnticipateDevEventMap> = (data: AnticipateDevEventMap[K]) => void

export class DevEventEmitter {
  private readonly listeners = new Map<keyof AnticipateDevEventMap, Set<Listener<any>>>()

  on<K extends keyof AnticipateDevEventMap>(event: K, listener: Listener<K>): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(listener)
    return () => {
      set!.delete(listener)
      if (set!.size === 0) this.listeners.delete(event)
    }
  }

  emit<K extends keyof AnticipateDevEventMap>(event: K, data: AnticipateDevEventMap[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      try { listener(data) } catch { }
    }
  }

  hasListeners(): boolean {
    return this.listeners.size > 0
  }

  removeAll(): void {
    this.listeners.clear()
  }
}
