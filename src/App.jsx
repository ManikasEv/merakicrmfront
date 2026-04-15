import { Routes, Route, Navigate } from 'react-router-dom'
import Layout       from './components/Layout'
import Dashboard    from './pages/Dashboard'
import Reservations from './pages/Reservations'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="reservations" element={<Reservations />} />
      </Route>
    </Routes>
  )
}
