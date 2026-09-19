import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import LobbyPage from '@/pages/lobby/LobbyPage'
import SchedulePage from '@/pages/schedule/SchedulePage'
import VotesPage from '@/pages/votes/VotesPage'
import VoteDetailPage from '@/pages/votes/VoteDetailPage'
import GamesPage from '@/pages/games/GamesPage'
import MiniGamesPage from '@/pages/minigames/MiniGamesPage'
import SettingsPage from '@/pages/settings/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<LobbyPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="votes" element={<VotesPage />} />
        <Route path="votes/:id" element={<VoteDetailPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="minigames" element={<MiniGamesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [init])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
