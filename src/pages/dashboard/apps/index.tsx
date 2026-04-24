import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Plus, CheckCircle2, AlertCircle, MoreVertical, Settings, RefreshCw, FlaskConical, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import api from '@/lib/api'
import type { App } from '@/types/api'
import { APP_CATALOG, APP_CATEGORIES, getAppsByCategory } from '@/lib/app-catalog'

function AppMenu({ app, tenantId }: { app: App; tenantId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const testMutation = useMutation({
    mutationFn: () => api.post<{ success: boolean; error?: string }>(`/tenants/${tenantId}/apps/${app.id}/test`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['apps', tenantId] })
      setOpen(false)
      const result = res.data
      if (result.success) toast('Connection test passed', 'success')
      else toast(result.error ?? 'Connection test failed', 'error')
    },
    onError: () => { toast('Connection test failed', 'error'); setOpen(false) },
  })
  const syncMutation = useMutation({
    mutationFn: () => api.post(`/tenants/${tenantId}/apps/${app.id}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', tenantId] })
      setOpen(false)
      toast('Sync job queued', 'success')
    },
    onError: () => { toast('Failed to start sync', 'error'); setOpen(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tenants/${tenantId}/apps/${app.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', tenantId] })
      toast('App deleted', 'success')
    },
    onError: () => toast('Failed to delete app', 'error'),
  })

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="rounded-[10px] p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-[10px] border bg-card p-1 shadow-lg">
          <Link to={`/t/${tenantId}/apps/${app.id}`} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted" onClick={() => setOpen(false)}>
            <Settings className="h-3.5 w-3.5" /> Configure
          </Link>
          <button onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50">
            <FlaskConical className="h-3.5 w-3.5" /> {testMutation.isPending ? 'Testing...' : 'Test Connection'}
          </button>
          {app.role !== 'destination' && (
            <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} /> {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
          <div className="my-1 border-t" />
          <ConfirmDialog
            title={`Delete ${app.name ?? app.code}?`}
            message="This will permanently remove this app and its configuration. This action cannot be undone."
            confirmLabel="Delete"
            onConfirm={() => deleteMutation.mutate()}
          >
            {(open) => (
              <button
                onClick={open}
                disabled={deleteMutation.isPending}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </ConfirmDialog>
        </div>
      )}
    </div>
  )
}

export default function AppsPage() {
  const { tenantId } = useParams()

  const { data: appsResponse, isLoading } = useQuery({
    queryKey: ['apps', tenantId],
    queryFn: () => api.get<{ data: App[] }>(`/tenants/${tenantId}/apps`).then((r) => r.data),
  })

  const appList = appsResponse?.data ?? []

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>

  return (
    <div>
      <PageHeader title="Apps" description="Connect your tools to power your AI support agent" />

      {appList.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Connected</h2>
          <div className="space-y-2">
            {appList.map((app) => {
              const def = APP_CATALOG[app.code]
              const Icon = def?.icon
              return (
                <div key={app.id} className="flex items-center gap-4 rounded-[14px] border bg-card px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${def?.color ?? '#787878'}15` }}>
                    {Icon && <Icon className="h-4 w-4" style={{ color: def?.color }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold">{app.name ?? def?.name ?? app.code}</span>
                      <Badge variant="outline" className="shrink-0">{app.type}</Badge>
                      <Badge variant="secondary" className="shrink-0">{app.role}</Badge>
                    </div>
                    {app.last_synced_at && (
                      <p className="text-xs text-muted-foreground">Synced {new Date(app.last_synced_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                    )}
                    {app.last_error && (
                      <p className="truncate text-xs text-destructive">{app.last_error}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {app.is_active ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <AppMenu app={app} tenantId={tenantId!} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {APP_CATEGORIES.map((category) => {
        const categoryApps = getAppsByCategory(category.key)
        if (!categoryApps.length) return null
        return (
          <section key={category.key} className="mb-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{category.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryApps.map((def) => {
                return (
                  <div key={def.code} className={`flex items-center gap-3 rounded-[14px] border bg-card px-4 py-3 ${def.comingSoon ? 'opacity-50' : ''}`}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${def.color}15` }}>
                      <def.icon className="h-4 w-4" style={{ color: def.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{def.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{def.description}</p>
                    </div>
                    <div className="shrink-0">
                      {def.comingSoon ? (
                        <span className="text-xs text-muted-foreground">Soon</span>
                      ) : (
                        <Link to={`/t/${tenantId}/apps/new?code=${def.code}`}>
                          <Button variant="outline" size="sm"><Plus className="mr-1.5 h-3 w-3" /> Add</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
