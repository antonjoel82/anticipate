import { type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { TrajectorySnapshot } from 'anticipate/core'
import { useSharedTrajectory } from '../context/TrajectoryContext.js'
import { getSettings, useDemoStore, incrementPreloadCount } from '../lib/demoStore.js'
import { ConfidenceBadge } from './ConfidenceBadge.js'

type AnticipateLinkProps = {
  to: string
  preload: () => boolean
  children: ReactNode
  icon?: string
  className?: string
}

function getGlowStyle(snapshot: TrajectorySnapshot | undefined, isShowingPredictions: boolean): CSSProperties {
  if (!isShowingPredictions || !snapshot || snapshot.confidence <= 0.5) return {}
  const intensity: number = (snapshot.confidence - 0.5) / 0.5
  return {
    borderColor: `rgba(74, 222, 128, ${0.3 + intensity * 0.7})`,
    boxShadow: `0 0 ${8 + intensity * 16}px rgba(74, 222, 128, ${intensity * 0.4})`,
    backgroundColor: `rgba(74, 222, 128, ${intensity * 0.06})`,
  }
}

export function AnticipateLink({ to, preload: preloadFn, children, icon, className = '' }: AnticipateLinkProps) {
  const { register, useSnapshot } = useSharedTrajectory()
  const settings = useDemoStore()
  const location = useLocation()
  const isActive: boolean = location.pathname === to
  const linkId: string = `nav-${to.replace(/\//g, '') || 'home'}`

  const ref = register(linkId, {
    whenApproaching: () => {
      if (!getSettings().isAnticipateEnabled) return
      if (preloadFn()) incrementPreloadCount()
    },
    tolerance: 30,
  })

  const snapshot: TrajectorySnapshot | undefined = useSnapshot(linkId)
  const glowStyle: CSSProperties = getGlowStyle(snapshot, settings.isShowingPredictions)
  const isGlowing: boolean = settings.isShowingPredictions && !!snapshot && snapshot.confidence > 0.5

  return (
    <Link
      to={to}
      ref={ref as React.RefCallback<HTMLAnchorElement>}
      className={`nav-link ${isActive ? 'active' : ''} ${isGlowing ? 'glowing' : ''} ${className}`}
      style={glowStyle}
      data-anticipate-id={linkId}
      data-anticipate-tolerance="30"
    >
      {icon && <span className="nav-icon">{icon}</span>}
      <span className="nav-label">{children}</span>
      <ConfidenceBadge snapshot={snapshot} isVisible={settings.isShowingPredictions} />
    </Link>
  )
}
