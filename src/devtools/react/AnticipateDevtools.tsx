import { useState, useSyncExternalStore } from 'react'
import type { AnticipateProfiler } from '../profiler.js'
import { DevtoolsToggle } from './DevtoolsToggle.js'
import { DevtoolsPanel } from './DevtoolsPanel.js'

type AnticipateDevtoolsProps = {
  profiler: AnticipateProfiler
  initialIsOpen?: boolean
  dock?: 'bottom' | 'right' | 'floating'
}

export function AnticipateDevtools({ profiler, initialIsOpen = false }: AnticipateDevtoolsProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen)

  const snapshot = useSyncExternalStore(
    (cb) => profiler.subscribe(cb),
    () => profiler.getSnapshot(),
  )

  return (
    <>
      <DevtoolsToggle onClick={() => setIsOpen(!isOpen)} isOpen={isOpen} />
      {isOpen && <DevtoolsPanel snapshot={snapshot} profiler={profiler} />}
    </>
  )
}
