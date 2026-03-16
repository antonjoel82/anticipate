import { describe, it, expect } from 'vitest'
import { CircularBuffer } from './buffer.js'

describe('CircularBuffer', () => {
  it('stores and retrieves items', () => {
    const buf = new CircularBuffer<number>(4)
    buf.add(1)
    buf.add(2)
    expect(buf.getLast()).toBe(2)
    expect(buf.getFirst()).toBe(1)
    expect(buf.length).toBe(2)
  })

  it('wraps around when full', () => {
    const buf = new CircularBuffer<number>(3)
    buf.add(1)
    buf.add(2)
    buf.add(3)
    buf.add(4)
    expect(buf.getFirst()).toBe(2)
    expect(buf.getLast()).toBe(4)
    expect(buf.length).toBe(3)
  })

  it('returns first and last efficiently after overflow', () => {
    const buf = new CircularBuffer<number>(8)
    for (let i = 0; i < 20; i++) buf.add(i)
    const result = buf.getFirstLast()
    expect(result).toBeDefined()
    const [first, last] = result!
    expect(first).toBe(12)
    expect(last).toBe(19)
  })

  it('handles empty buffer', () => {
    const buf = new CircularBuffer<number>(4)
    expect(buf.length).toBe(0)
    expect(buf.getLast()).toBeUndefined()
    expect(buf.getFirst()).toBeUndefined()
    expect(buf.getFirstLast()).toBeUndefined()
  })

  it('clears all items', () => {
    const buf = new CircularBuffer<number>(4)
    buf.add(1)
    buf.add(2)
    buf.clear()
    expect(buf.length).toBe(0)
    expect(buf.getLast()).toBeUndefined()
  })

  it('rejects zero capacity', () => {
    expect(() => new CircularBuffer(0)).toThrow()
  })

  it('rejects negative capacity', () => {
    expect(() => new CircularBuffer(-1)).toThrow()
  })

  it('handles single-capacity buffer', () => {
    const buf = new CircularBuffer<string>(1)
    buf.add('a')
    expect(buf.getLast()).toBe('a')
    expect(buf.getFirst()).toBe('a')
    buf.add('b')
    expect(buf.getLast()).toBe('b')
    expect(buf.getFirst()).toBe('b')
    expect(buf.length).toBe(1)
  })

  it('iterates with forEach in insertion order', () => {
    const buf = new CircularBuffer<number>(4)
    buf.add(10)
    buf.add(20)
    buf.add(30)
    const collected: Array<number> = []
    buf.forEach((item) => collected.push(item))
    expect(collected).toEqual([10, 20, 30])
  })

  it('iterates correctly after wrap-around', () => {
    const buf = new CircularBuffer<number>(3)
    buf.add(1)
    buf.add(2)
    buf.add(3)
    buf.add(4)
    buf.add(5)
    const collected: Array<number> = []
    buf.forEach((item) => collected.push(item))
    expect(collected).toEqual([3, 4, 5])
  })
})
