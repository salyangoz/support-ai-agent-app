import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, CheckCircle2, XCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import api from '@/lib/api'
import type { App } from '@/types/api'
import { APP_CATALOG, type AppDefinition } from '@/lib/app-catalog'

type TestStatus = 'idle' | 'testing' | 'success' | 'failed'

function CredentialField({ field, value, onChange, isEdit }: {
  field: import('@/lib/app-catalog').CredentialField
  value: string
  onChange: (v: string) => void
  isEdit: boolean
}) {
  const [visible, setVisible] = useState(false)
  const isSecret = field.type === 'password'
  const masked = isSecret && isEdit && !visible && value.length > 0

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`cred-${field.key}`}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={`cred-${field.key}`}
          type={masked ? 'password' : 'text'}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={isSecret ? 'pr-10' : ''}
        />
        {isSecret && value.length > 0 && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
    </div>
  )
}

const appRoles: Record<string, string[]> = {
  ticket: ['source', 'destination', 'both'],
  knowledge: ['source'],
  voice: ['source'],
  transcription: ['source'],
}

export default function AppFormPage() {
  const { tenantId, appId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = !!appId

  const preselectedCode = searchParams.get('code') ?? 'intercom'
  const [code, setCode] = useState(preselectedCode)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [config, setConfig] = useState<Record<string, string>>({})
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError] = useState('')
  const [savedAppId, setSavedAppId] = useState<string | null>(appId ?? null)
  const [tab, setTab] = useState('credentials')

  const def: AppDefinition | undefined = APP_CATALOG[code]
  const hasConfig = def && def.configFields && def.configFields.length > 0

  useEffect(() => {
    if (def && !isEdit) {
      setRole(def.role)
      setCredentials({})
      setConfig({})
    }
  }, [code, def, isEdit])

  const { data: existingApp, isLoading } = useQuery({
    queryKey: ['app', tenantId, appId],
    queryFn: () => api.get<App>(`/tenants/${tenantId}/apps/${appId}`).then((r) => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingApp) {
      setCode(existingApp.code)
      setName(existingApp.name ?? '')
      setRole(existingApp.role)
      setIsActive(existingApp.is_active)
      const creds: Record<string, string> = {}
      if (existingApp.credentials && typeof existingApp.credentials === 'object') {
        for (const [k, v] of Object.entries(existingApp.credentials)) creds[k] = String(v)
      }
      setCredentials(creds)
      const cfg: Record<string, string> = {}
      if (existingApp.config && typeof existingApp.config === 'object') {
        for (const [k, v] of Object.entries(existingApp.config)) cfg[k] = String(v)
      }
      setConfig(cfg)
    }
  }, [existingApp])

  const saveApp = (data: Record<string, unknown>) => {
    const existingId = appId ?? savedAppId
    return existingId
      ? api.put(`/tenants/${tenantId}/apps/${existingId}`, data).then((r) => r.data as App)
      : api.post(`/tenants/${tenantId}/apps`, data).then((r) => r.data as App)
  }

  const credentialsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => saveApp(data),
    onSuccess: async (app: App) => {
      queryClient.invalidateQueries({ queryKey: ['apps', tenantId] })
      const id = app?.id ?? savedAppId
      if (!id) { navigate(`/t/${tenantId}/apps`); return }
      if (id !== appId) {
        setSavedAppId(id)
        // Move to the edit URL so refresh / reuse of "back" works and
        // future saves go through PUT regardless of local React state.
        navigate(`/t/${tenantId}/apps/${id}`, { replace: true })
      }
      setTestStatus('testing')
      setTestError('')
      try {
        const { data } = await api.post<{ success: boolean; error?: string }>(`/tenants/${tenantId}/apps/${id}/test`)
        if (data.success) {
          setTestStatus('success')
          toast('Connection test passed', 'success')
        } else {
          setTestStatus('failed')
          setTestError(data.error ?? 'Connection test failed')
          toast(data.error ?? 'Connection test failed', 'error')
        }
      } catch (err: unknown) {
        setTestStatus('failed')
        const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Connection test failed'
        setTestError(message)
        toast(message, 'error')
      }
    },
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save credentials')
    },
  })

  const configMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put(`/tenants/${tenantId}/apps/${savedAppId ?? appId}`, data).then((r) => r.data as App),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', tenantId] })
      toast('Configuration saved', 'success')
    },
    onError: (err: unknown) => {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save configuration')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tenants/${tenantId}/apps/${appId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', tenantId] })
      navigate(`/t/${tenantId}/apps`)
      toast('App deleted', 'success')
    },
  })

  const handleCredentialsSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (def) {
      const missing = def.credentials.filter((f) => f.required && !credentials[f.key]?.trim())
      if (missing.length) { setError(`Required: ${missing.map((f) => f.label).join(', ')}`); return }
    }
    credentialsMutation.mutate({
      code, type: def?.type ?? 'ticket', role, name: name || null,
      credentials: castFields(credentials, def?.credentials),
      config: castFields(config, def?.configFields),
      is_active: isActive,
    })
  }

  const handleConfigSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (def) {
      const missing = (def.configFields ?? []).filter((f) => f.required && !config[f.key]?.trim())
      if (missing.length) { setError(`Required: ${missing.map((f) => f.label).join(', ')}`); return }
    }
    configMutation.mutate({
      code, type: def?.type ?? 'ticket', role, name: name || null,
      credentials: castFields(credentials, def?.credentials),
      config: castFields(config, def?.configFields),
      is_active: isActive,
    })
  }

  function castFields(values: Record<string, string>, fields?: import('@/lib/app-catalog').CredentialField[]): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(values)) {
      const field = fields?.find((f) => f.key === key)
      if (field?.type === 'checkbox') {
        result[key] = val === 'true'
      } else if (val !== '' && !isNaN(Number(val)) && field?.type === 'text' && /^\d+$/.test(val)) {
        result[key] = Number(val)
      } else {
        result[key] = val
      }
    }
    return result
  }

  const updateCredential = (key: string, value: string) => setCredentials((prev) => ({ ...prev, [key]: value }))
  const updateConfig = (key: string, value: string) => setConfig((prev) => ({ ...prev, [key]: value }))

  if (isEdit && isLoading) return <div className="flex justify-center p-12"><Spinner /></div>

  const availableRoles = appRoles[def?.type ?? 'ticket'] ?? ['source', 'destination', 'both']

  return (
    <div>
      <PageHeader
        title={isEdit ? `Configure ${def?.name ?? 'App'}` : `Connect ${def?.name ?? 'App'}`}
        description={def?.description}
        actions={isEdit ? (
          <ConfirmDialog
            title={`Delete ${def?.name ?? 'App'}?`}
            message="This will permanently remove this app and its configuration. This action cannot be undone."
            confirmLabel="Delete"
            onConfirm={() => deleteMutation.mutate()}
          >
            {(open) => (
              <Button variant="destructive" size="sm" onClick={open} disabled={deleteMutation.isPending}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
          </ConfirmDialog>
        ) : undefined}
      />

      {error && (
        <div className="mb-4 max-w-2xl rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          {hasConfig && <TabsTrigger value="configuration">Configuration</TabsTrigger>}
        </TabsList>

        <TabsContent value="credentials">
          <form onSubmit={handleCredentialsSubmit}>
            <div className="rounded-b-[20px] border border-t-0 bg-card p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={def?.name ?? 'Optional'} />
                </div>

                {availableRoles.length > 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                      {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {role === 'source' && 'Read-only — imports data from this service'}
                      {role === 'destination' && 'Write-only — sends replies to this service'}
                      {role === 'both' && 'Bi-directional — imports data and sends replies'}
                    </p>
                  </div>
                )}

                {def && def.credentials.length > 0 && def.credentials.map((field) => (
                  <CredentialField key={field.key} field={field} value={credentials[field.key] ?? ''} onChange={(v) => updateCredential(field.key, v)} isEdit={isEdit} />
                ))}

                {isEdit && def?.type === 'ticket' && (
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={`${window.location.origin}/webhooks/${tenantId}/apps/${appId}`}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Configure this URL in your {def?.name} webhook settings</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-input" />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                {testStatus !== 'idle' && (
                  <div className={`flex items-start gap-3 rounded-[10px] border p-4 ${
                    testStatus === 'success' ? 'border-success/30 bg-success/5' : testStatus === 'failed' ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                  }`}>
                    {testStatus === 'testing' && <><Spinner className="mt-0.5 h-5 w-5" /><div><p className="text-sm font-medium">Testing connection...</p></div></>}
                    {testStatus === 'success' && <><CheckCircle2 className="mt-0.5 h-5 w-5 text-success" /><div><p className="text-sm font-medium text-success">Connection successful</p></div></>}
                    {testStatus === 'failed' && <><XCircle className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="text-sm font-medium text-destructive">Connection failed</p><p className="text-xs text-muted-foreground">{testError}</p></div></>}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  {testStatus === 'success' ? (
                    <Link to={`/t/${tenantId}/apps`}><Button type="button">Go to Apps <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                  ) : testStatus === 'failed' ? (
                    <>
                      <Button type="button" onClick={() => { setTestStatus('idle'); setTestError('') }}>Edit Credentials</Button>
                      <Link to={`/t/${tenantId}/apps`}><Button type="button" variant="outline">Go to Apps</Button></Link>
                    </>
                  ) : (
                    <>
                      <Button type="submit" disabled={credentialsMutation.isPending || testStatus === 'testing'}>
                        {credentialsMutation.isPending ? 'Saving...' : testStatus === 'testing' ? 'Testing...' : isEdit ? 'Save & Test' : 'Connect & Test'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => navigate(`/t/${tenantId}/apps`)}>Cancel</Button>
                    </>
                  )}
                </div>
            </div>
          </form>
        </TabsContent>

        {hasConfig && (
          <TabsContent value="configuration">
            <form onSubmit={handleConfigSubmit}>
              <div className="rounded-b-[20px] border border-t-0 bg-card p-5 space-y-4">
                  {def!.configFields!.map((field) => (
                    field.type === 'checkbox' ? (
                      <div key={field.key} className="flex items-start gap-2">
                        <input type="checkbox" id={`cfg-${field.key}`} checked={config[field.key] === 'true'} onChange={(e) => updateConfig(field.key, String(e.target.checked))} className="mt-0.5 h-4 w-4 rounded border-input" />
                        <div>
                          <Label htmlFor={`cfg-${field.key}`}>{field.label}</Label>
                          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                        </div>
                      </div>
                    ) : (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={`cfg-${field.key}`}>
                          {field.label}
                          {field.required && <span className="ml-1 text-destructive">*</span>}
                        </Label>
                        <Input id={`cfg-${field.key}`} type={field.type} placeholder={field.placeholder} value={config[field.key] ?? ''} onChange={(e) => updateConfig(field.key, e.target.value)} required={field.required} />
                        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                      </div>
                    )
                  ))}
                  <div className="pt-2">
                    <Button type="submit" disabled={configMutation.isPending}>
                      {configMutation.isPending ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>
              </div>
            </form>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
