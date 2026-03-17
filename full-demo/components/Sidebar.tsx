import { AnticipateLink } from './AnticipateLink.js'
import { preload } from '../lib/cache.js'
import { fakeFetch } from '../lib/fakeFetch.js'
import { DASHBOARD_STATS, ORDERS, ONBOARDING_STEPS } from '../lib/fakeData.js'

export function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">&#x25CE;</span>
        <span>anticipate</span>
        <span className="brand-tag">demo</span>
      </div>

      <div className="sidebar-section-label">Pages</div>

      <div className="sidebar-nav">
        <AnticipateLink
          to="/"
          icon="&#x25E7;"
          preload={() => preload('dashboard-stats', () => fakeFetch(DASHBOARD_STATS))}
        >
          Dashboard
        </AnticipateLink>

        <AnticipateLink
          to="/orders"
          icon="&#x2630;"
          preload={() => preload('orders-list', () => fakeFetch(ORDERS))}
        >
          Orders
        </AnticipateLink>

        <AnticipateLink
          to="/onboarding"
          icon="&#x27D0;"
          preload={() => preload('onboarding-step-0', () => fakeFetch(ONBOARDING_STEPS[0]))}
        >
          Onboarding
        </AnticipateLink>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-hint">
          Move your cursor toward a<br />
          nav link to preload its data.
        </div>
      </div>
    </nav>
  )
}
