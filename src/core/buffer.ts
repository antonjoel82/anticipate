export class CircularBuffer<T> {
  private readonly items: Array<T | undefined>
  private head: number = 0
  private count: number = 0
  private readonly capacity: number

  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error(`CircularBuffer capacity must be at least 1, got ${capacity}`)
    }
    this.capacity = capacity
    this.items = new Array<T | undefined>(capacity).fill(undefined)
  }

  add(item: T): void {
    this.items[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) {
      this.count++
    }
  }

  getLast(): T | undefined {
    if (this.count === 0) return undefined
    const index: number = (this.head - 1 + this.capacity) % this.capacity
    return this.items[index]
  }

  getFirst(): T | undefined {
    if (this.count === 0) return undefined
    const index: number = (this.head - this.count + this.capacity) % this.capacity
    return this.items[index]
  }

  getFirstLast(): [T, T] | undefined {
    if (this.count === 0) return undefined
    const first = this.getFirst()!
    const last = this.getLast()!
    return [first, last]
  }

  get length(): number {
    return this.count
  }

  forEach(callback: (item: T, index: number) => void): void {
    const start: number = (this.head - this.count + this.capacity) % this.capacity
    for (let i = 0; i < this.count; i++) {
      const index: number = (start + i) % this.capacity
      callback(this.items[index] as T, i)
    }
  }

  clear(): void {
    this.head = 0
    this.count = 0
    this.items.fill(undefined)
  }
}
