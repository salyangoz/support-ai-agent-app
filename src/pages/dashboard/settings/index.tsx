import { useState, useEffect, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/context/auth-context'
import api from '@/lib/api'
import type { Tenant, TenantSettings } from '@/types/api'

export default function SettingsPage() {
  const { tenantId } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [searchParams, setSearchParams] = useSearchParams()
  const activeTenantUser = user?.tenant_users?.find((tu) => tu.tenant_id === tenantId)

  const storageKey = `tenant-settings-${tenantId}`

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      try {
        const { data } = await api.get<Tenant>(`/tenants/${tenantId}`)
        return data
      } catch {
        // GET /tenants/:tenantId requires admin auth — fall back to localStorage cache
        const cached = localStorage.getItem(storageKey)
        if (cached) return JSON.parse(cached) as Tenant
        return null
      }
    },
  })

  const tab = searchParams.get('tab') ?? 'general'
  const setTab = (value: string) => setSearchParams({ tab: value }, { replace: true })
  const [name, setName] = useState('')
  const [settings, setSettings] = useState<TenantSettings>({})
  const [successTab, setSuccessTab] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (tenant) {
      setName(tenant.name)
      setSettings(tenant.settings ?? {})
    } else if (activeTenantUser?.tenant) {
      setName(activeTenantUser.tenant.name)
    }
  }, [tenant, activeTenantUser])

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch<Tenant>(`/tenants/${tenantId}`, data).then((r) => r.data),
    onSuccess: (updated: Tenant) => {
      // Cache the full response for future page loads
      if (updated) {
        localStorage.setItem(storageKey, JSON.stringify(updated))
        queryClient.setQueryData(['tenant', tenantId], updated)
      }
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
      setError('')
      const currentTab = searchParams.get('tab') ?? 'general'
      setSuccessTab(currentTab)
      setTimeout(() => setSuccessTab(null), 3000)
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string }; status?: number } })?.response?.data?.error
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        setError('You do not have permission to update settings. Owner role required.')
      } else {
        setError(message ?? 'Failed to save settings. Please try again.')
      }
    },
  })

  const updateSetting = (key: keyof TenantSettings, value: unknown) =>
    setSettings((s) => ({ ...s, [key]: value }))

  const save = (data: Record<string, unknown>) => {
    setError('')
    setSuccessTab(null)
    mutation.mutate(data)
  }

  const saveGeneral = (e: FormEvent) => {
    e.preventDefault()
    save({
      name,
      settings: {
        auto_send_drafts: settings.auto_send_drafts,
        auto_generate_kb: settings.auto_generate_kb,
      },
    })
  }

  const saveAI = (e: FormEvent) => {
    e.preventDefault()
    save({
      settings: {
        ai_service: settings.ai_service ?? 'deepseek',
        ai_model: settings.ai_model ?? 'deepseek-chat',
        ai_credentials: settings.ai_credentials,
        draft_tone: settings.draft_tone ?? 'professional',
        default_language: settings.default_language ?? 'en',
        rag_top_k: settings.rag_top_k ?? 5,
        ai_instructions: settings.ai_instructions,
      },
    })
  }

  const saveEmbedding = (e: FormEvent) => {
    e.preventDefault()
    save({
      settings: {
        embedding_service: settings.embedding_service ?? 'chat-gpt',
        embedding_model: settings.embedding_model ?? 'text-embedding-3-small',
        embedding_credentials: settings.embedding_credentials,
      },
    })
  }

  const saveAdvanced = (e: FormEvent) => {
    e.preventDefault()
    save({
      settings: {
        max_context_tokens: settings.max_context_tokens ?? 4000,
        sync_lookback_minutes: settings.sync_lookback_minutes ?? 10,
        draft_debounce_seconds: settings.draft_debounce_seconds ?? 60,
      },
    })
  }

  if (isLoading && !activeTenantUser) return <div className="flex justify-center p-12"><Spinner /></div>

  return (
    <div>
      <PageHeader title="Settings" description="Configure your tenant and AI agent behavior" />

      {error && (
        <div className="mb-4 max-w-3xl rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ai">AI Model</TabsTrigger>
          <TabsTrigger value="embedding">Embedding</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form onSubmit={saveGeneral}>
            <div className="rounded-b-[20px] border border-t-0 bg-card p-5 space-y-4">
                {successTab === 'general' && (
                  <div className="rounded-md bg-success/10 p-3 text-sm text-success">Settings saved successfully.</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Tenant Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                {tenant?.api_key && (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input value={tenant.api_key} readOnly className="font-mono text-xs" />
                    <p className="text-xs text-muted-foreground">Use this key for machine-to-machine API access</p>
                  </div>
                )}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto_send_drafts"
                      checked={settings.auto_send_drafts ?? false}
                      onChange={(e) => updateSetting('auto_send_drafts', e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="auto_send_drafts">Auto-send drafts (skip review step)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto_generate_kb"
                      checked={settings.auto_generate_kb ?? false}
                      onChange={(e) => updateSetting('auto_generate_kb', e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="auto_generate_kb">Auto-generate knowledge base from resolved tickets</Label>
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="ai">
          <form onSubmit={saveAI}>
            <div className="rounded-b-[20px] border border-t-0 bg-card p-5 space-y-5">
                {successTab === 'ai' && (
                  <div className="rounded-md bg-success/10 p-3 text-sm text-success">Settings saved successfully.</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai_service">Service</Label>
                    <Select
                      id="ai_service"
                      value={settings.ai_service ?? 'deepseek'}
                      onChange={(e) => {
                        updateSetting('ai_service', e.target.value)
                        const defaults: Record<string, string> = {
                          deepseek: 'deepseek-chat',
                          'chat-gpt': 'gpt-4o',
                        }
                        updateSetting('ai_model', defaults[e.target.value] ?? '')
                      }}
                    >
                      <option value="deepseek">DeepSeek</option>
                      <option value="chat-gpt">ChatGPT (OpenAI)</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai_model">Model</Label>
                    <Select
                      id="ai_model"
                      value={settings.ai_model ?? 'deepseek-chat'}
                      onChange={(e) => updateSetting('ai_model', e.target.value)}
                    >
                      {(settings.ai_service ?? 'deepseek') === 'deepseek' && (
                        <>
                          <option value="deepseek-chat">deepseek-chat</option>
                          <option value="deepseek-reasoner">deepseek-reasoner</option>
                        </>
                      )}
                      {settings.ai_service === 'chat-gpt' && (
                        <>
                          <option value="gpt-4o">gpt-4o</option>
                          <option value="gpt-4o-mini">gpt-4o-mini</option>
                          <option value="gpt-4.1">gpt-4.1</option>
                          <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                          <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                          <option value="o3-mini">o3-mini</option>
                        </>
                      )}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_api_key">API Key</Label>
                  <Input
                    id="ai_api_key"
                    type="password"
                    value={settings.ai_credentials?.api_key ?? ''}
                    onChange={(e) => updateSetting('ai_credentials', { api_key: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>

                <div className="border-t pt-5">
                  <h3 className="mb-4 text-sm font-medium">Response Behavior</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="draft_tone">Tone</Label>
                      <Select
                        id="draft_tone"
                        value={settings.draft_tone ?? 'professional'}
                        onChange={(e) => updateSetting('draft_tone', e.target.value)}
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_language">Language</Label>
                      <Select
                        id="default_language"
                        value={settings.default_language ?? 'en'}
                        onChange={(e) => updateSetting('default_language', e.target.value)}
                      >
                        <option value="en">English</option>
                        <option value="tr">Turkish</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="pt">Portuguese</option>
                        <option value="ar">Arabic</option>
                        <option value="zh">Chinese</option>
                        <option value="ja">Japanese</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rag_top_k">RAG Top K</Label>
                      <Input
                        id="rag_top_k"
                        type="number"
                        min={1}
                        max={20}
                        value={settings.rag_top_k ?? 5}
                        onChange={(e) => updateSetting('rag_top_k', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_instructions">Custom Instructions</Label>
                  <Textarea
                    id="ai_instructions"
                    value={settings.ai_instructions ?? ''}
                    onChange={(e) => updateSetting('ai_instructions', e.target.value)}
                    placeholder="Additional instructions for the AI agent (e.g. tone, domain, company context)..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="embedding">
          <form onSubmit={saveEmbedding}>
            <div className="rounded-b-[20px] border border-t-0 bg-card p-5 space-y-5">
                {successTab === 'embedding' && (
                  <div className="rounded-md bg-success/10 p-3 text-sm text-success">Settings saved successfully.</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="embedding_service">Service</Label>
                    <Select
                      id="embedding_service"
                      value={settings.embedding_service ?? 'chat-gpt'}
                      onChange={(e) => {
                        updateSetting('embedding_service', e.target.value)
                        const defaults: Record<string, string> = {
                          'chat-gpt': 'text-embedding-3-small',
                          deepseek: 'deepseek-chat',
                        }
                        updateSetting('embedding_model', defaults[e.target.value] ?? '')
                      }}
                    >
                      <option value="deepseek">DeepSeek</option>
                      <option value="chat-gpt">ChatGPT (OpenAI)</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="embedding_model">Model</Label>
                    <Select
                      id="embedding_model"
                      value={settings.embedding_model ?? 'text-embedding-3-small'}
                      onChange={(e) => updateSetting('embedding_model', e.target.value)}
                    >
                      {(settings.embedding_service ?? 'chat-gpt') === 'chat-gpt' && (
                        <>
                          <option value="text-embedding-3-small">text-embedding-3-small</option>
                          <option value="text-embedding-3-large">text-embedding-3-large</option>
                          <option value="text-embedding-ada-002">text-embedding-ada-002</option>
                        </>
                      )}
                      {settings.embedding_service === 'deepseek' && (
                        <option value="deepseek-chat">deepseek-chat</option>
                      )}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embedding_api_key">API Key</Label>
                  <Input
                    id="embedding_api_key"
                    type="password"
                    value={settings.embedding_credentials?.api_key ?? ''}
                    onChange={(e) => updateSetting('embedding_credentials', { api_key: e.target.value })}
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use the AI Model API key as fallback</p>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="advanced">
          <form onSubmit={saveAdvanced}>
            <div className="rounded-b-[20px] border border-t-0 bg-card p-5 space-y-4">
                {successTab === 'advanced' && (
                  <div className="rounded-md bg-success/10 p-3 text-sm text-success">Settings saved successfully.</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_context_tokens">Max Context Tokens</Label>
                    <Input
                      id="max_context_tokens"
                      type="number"
                      value={settings.max_context_tokens ?? 4000}
                      onChange={(e) => updateSetting('max_context_tokens', Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Maximum tokens for RAG context window</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sync_lookback_minutes">Sync Lookback (min)</Label>
                    <Input
                      id="sync_lookback_minutes"
                      type="number"
                      value={settings.sync_lookback_minutes ?? 10}
                      onChange={(e) => updateSetting('sync_lookback_minutes', Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Polling window for ticket sync</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="draft_debounce_seconds">Draft Debounce (sec)</Label>
                    <Input
                      id="draft_debounce_seconds"
                      type="number"
                      min={0}
                      value={settings.draft_debounce_seconds ?? 60}
                      onChange={(e) => updateSetting('draft_debounce_seconds', Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Wait after last customer message before drafting</p>
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
