import { Routes, Route, Navigate } from 'react-router-dom'
import Layout       from './components/Layout'
import Dashboard    from './pages/Dashboard'
import Reservations from './pages/Reservations'
import Clients      from './pages/Clients'
import MenuPage     from './pages/MenuPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="clients"      element={<Clients />} />
        <Route path="menu"         element={<MenuPage />} />
      </Route>
    </Routes>
  )
}
