import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TrajectoryProvider } from './context/TrajectoryContext.js'
import { Sidebar } from './components/Sidebar.js'
import { SettingsPanel } from './components/SettingsPanel.js'
import { DebugOverlay } from './components/DebugOverlay.js'
import { Dashboard } from './pages/Dashboard.js'
import { Orders } from './pages/Orders.js'
import { Onboarding } from './pages/Onboarding.js'

function ExternalRedirect({ to }: { to: string }) {
  window.location.replace(to)
  return null
}

function DemoLayout() {
  return (
    <TrajectoryProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
        </main>
      </div>
      <DebugOverlay />
      <SettingsPanel />
    </TrajectoryProvider>
  )
}

export function App() {
  return (
    <BrowserRouter basename="/anticipated">
      <Routes>
        <Route path="/" element={<ExternalRedirect to="https://joelanton.com" />} />
        <Route path="/classy/*" element={<DemoLayout />} />
        <Route path="*" element={<Navigate to="/classy" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
