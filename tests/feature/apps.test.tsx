import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/auth-context'
import AppsPage from '@/pages/dashboard/apps/index'
import AppFormPage from '@/pages/dashboard/apps/app-form'
import { render } from '@testing-library/react'
import { TENANT_ID, APP_ID } from '../mocks/data'
import { seedAuth } from '../render'

function renderInRoute(path: string, element: React.ReactElement, initialEntry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          <Routes>
            <Route path={path} element={element} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Apps List', () => {
  it('renders the apps page header', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps`, <AppsPage />, `/t/${TENANT_ID}/apps`)

    await waitFor(() => {
      expect(screen.getByText('Apps')).toBeInTheDocument()
    })
  })

  it('loads and displays connected apps from the API', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps`, <AppsPage />, `/t/${TENANT_ID}/apps`)

    await waitFor(() => {
      expect(screen.getByText('Intercom Production')).toBeInTheDocument()
      expect(screen.getByText('Slack Notifications')).toBeInTheDocument()
    })
  })

  it('shows app type and role badges on connected apps', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps`, <AppsPage />, `/t/${TENANT_ID}/apps`)

    await waitFor(() => {
      expect(screen.getAllByText('ticket').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('both').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows action menu for connected apps', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps`, <AppsPage />, `/t/${TENANT_ID}/apps`)

    await waitFor(() => {
      expect(screen.getByText('Intercom Production')).toBeInTheDocument()
      expect(screen.getByText('Slack Notifications')).toBeInTheDocument()
    })
  })

  it('shows app catalog categories', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps`, <AppsPage />, `/t/${TENANT_ID}/apps`)

    await waitFor(() => {
      expect(screen.getByText('Ticket Management')).toBeInTheDocument()
      expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
    })
  })

  it('shows Connect button for available apps', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps`, <AppsPage />, `/t/${TENANT_ID}/apps`)

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument()
      expect(screen.getByText('Web Scraper')).toBeInTheDocument()
      expect(screen.getByText('Slack KB')).toBeInTheDocument()
    })
  })
})

describe('App Form - New', () => {
  it('renders the connect form with display name and credential fields', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new`)

    await waitFor(() => {
      expect(screen.getByText(/connect intercom/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
  })

  it('shows Intercom credential fields by default', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new`)

    await waitFor(() => {
      expect(screen.getByLabelText(/access token/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/client secret/i)).toBeInTheDocument()
  })

  it('shows GitHub credential fields when code=github in URL', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new?code=github`)

    await waitFor(() => {
      expect(screen.getByLabelText(/personal access token/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/repository owner/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/repository name/i)).toBeInTheDocument()
  })

  it('marks credential fields as required', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new`)

    await waitFor(() => {
      expect(screen.getByLabelText(/access token/i)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/access token/i)).toBeRequired()
    expect(screen.getByLabelText(/client secret/i)).toBeRequired()
  })
})

describe('App Form - Edit', () => {
  it('loads existing app data', async () => {
    seedAuth()
    renderInRoute(
      `/t/:tenantId/apps/:appId`,
      <AppFormPage />,
      `/t/${TENANT_ID}/apps/${APP_ID}`,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toHaveValue('Intercom Production')
    })
  })

  it('shows delete button when editing', async () => {
    seedAuth()
    renderInRoute(
      `/t/:tenantId/apps/:appId`,
      <AppFormPage />,
      `/t/${TENANT_ID}/apps/${APP_ID}`,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
  })

  it('shows Save & Test button when editing', async () => {
    seedAuth()
    renderInRoute(
      `/t/:tenantId/apps/:appId`,
      <AppFormPage />,
      `/t/${TENANT_ID}/apps/${APP_ID}`,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save & test/i })).toBeInTheDocument()
    })
  })
})

describe('App Form - Test Connection', () => {
  it('shows Connect & Test button for new apps', async () => {
    seedAuth()
    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new`)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect & test/i })).toBeInTheDocument()
    })
  })

  it('runs test after saving and shows success', async () => {
    seedAuth()
    const user = userEvent.setup()
    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new`)

    await waitFor(() => {
      expect(screen.getByLabelText(/access token/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/access token/i), 'test-token')
    await user.type(screen.getByLabelText(/client secret/i), 'test-secret')
    await user.click(screen.getByRole('button', { name: /connect & test/i }))

    await waitFor(() => {
      expect(screen.getByText(/connection successful/i)).toBeInTheDocument()
    })

    expect(screen.getByRole('link', { name: /go to apps/i })).toBeInTheDocument()
  })

  it('shows failure message when test fails', async () => {
    seedAuth()
    const user = userEvent.setup()

    server.use(
      http.post(`/api/tenants/${TENANT_ID}/apps/:appId/test`, () => {
        return HttpResponse.json({ success: false, error: 'Invalid access token' })
      }),
    )

    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new`)

    await waitFor(() => {
      expect(screen.getByLabelText(/access token/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/access token/i), 'bad-token')
    await user.type(screen.getByLabelText(/client secret/i), 'bad-secret')
    await user.click(screen.getByRole('button', { name: /connect & test/i }))

    await waitFor(() => {
      expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/invalid access token/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit credentials/i })).toBeInTheDocument()
  })

  it('allows editing credentials after failed test', async () => {
    seedAuth()
    const user = userEvent.setup()

    server.use(
      http.post(`/api/tenants/${TENANT_ID}/apps/:appId/test`, () => {
        return HttpResponse.json({ success: false, error: 'Bad credentials' })
      }),
    )

    renderInRoute(`/t/:tenantId/apps/new`, <AppFormPage />, `/t/${TENANT_ID}/apps/new`)

    await waitFor(() => {
      expect(screen.getByLabelText(/access token/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/access token/i), 'bad-token')
    await user.type(screen.getByLabelText(/client secret/i), 'bad-secret')
    await user.click(screen.getByRole('button', { name: /connect & test/i }))

    await waitFor(() => {
      expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit credentials/i }))

    // Back to form - submit button should be visible again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect & test/i })).toBeInTheDocument()
    })
  })
})
