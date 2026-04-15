import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { ToastProvider } from '@/components/ui/toast'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Spinner } from '@/components/ui/spinner'
import LoginPage from '@/pages/auth/login'
import RegisterPage from '@/pages/auth/register'
import CreateTenantPage from '@/pages/onboarding/create-tenant'
import DashboardPage from '@/pages/dashboard/index'
import AppsPage from '@/pages/dashboard/apps/index'
import AppFormPage from '@/pages/dashboard/apps/app-form'
import TicketsPage from '@/pages/dashboard/tickets/index'
import TicketDetailPage from '@/pages/dashboard/tickets/ticket-detail'
import KnowledgeBasePage from '@/pages/dashboard/knowledge/index'
import CustomersPage from '@/pages/dashboard/customers/index'
import DraftsPage from '@/pages/dashboard/drafts/index'
import UsersPage from '@/pages/dashboard/users/index'
import SettingsPage from '@/pages/dashboard/settings/index'
import ChatPage from '@/pages/dashboard/chat/index'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, activeTenantId } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!activeTenantId) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

function RootRedirect() {
  const { isAuthenticated, isLoading, activeTenantId } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (activeTenantId) return <Navigate to={`/t/${activeTenantId}`} replace />
  return <Navigate to="/onboarding" replace />
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, activeTenantId } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isAuthenticated && activeTenantId) return <Navigate to={`/t/${activeTenantId}`} replace />
  if (isAuthenticated) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/onboarding" element={<AuthenticatedRoute><CreateTenantPage /></AuthenticatedRoute>} />

            <Route
              path="/t/:tenantId"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="apps" element={<AppsPage />} />
              <Route path="apps/new" element={<AppFormPage />} />
              <Route path="apps/:appId" element={<AppFormPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
              <Route path="knowledge" element={<KnowledgeBasePage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="drafts" element={<DraftsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
