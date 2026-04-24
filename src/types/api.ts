export interface Tenant {
  id: string
  name: string
  slug: string
  api_key: string
  settings: TenantSettings
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  auto_send_drafts?: boolean
  default_language?: string
  rag_top_k?: number
  embedding_dimension?: number
  ai_service?: string
  ai_model?: string
  embedding_service?: string
  embedding_model?: string
  ai_credentials?: { api_key?: string }
  embedding_credentials?: { api_key?: string }
  ai_instructions?: string
  draft_tone?: string
  auto_generate_kb?: boolean
  max_context_tokens?: number
  sync_lookback_minutes?: number
  draft_debounce_seconds?: number
  output_app_ids?: string[]
}

export interface User {
  id: string
  email: string
  name: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
  tenant_users?: TenantUser[]
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  is_active: boolean
  created_at: string
  updated_at: string
  tenant?: Tenant
  user?: User
}

export interface App {
  id: string
  tenant_id: string
  code: string
  type: 'ticket' | 'knowledge' | 'notification' | 'voice' | 'transcription'
  role: 'source' | 'destination' | 'both'
  name: string | null
  credentials: Record<string, string>
  webhook_secret: string | null
  config: Record<string, unknown>
  is_active: boolean
  last_synced_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  tenant_id: string
  external_id: string | null
  email: string | null
  name: string | null
  phone: string | null
  metadata: Record<string, unknown>
  ticket_count?: number
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  tenant_id: string
  customer_id: string | null
  input_app_id: string | null
  output_app_id: string | null
  external_id: string
  state: 'open' | 'pending' | 'resolved' | 'closed'
  subject: string | null
  initial_body: string | null
  language: string | null
  assignee_id: string | null
  external_created_at: string | null
  external_updated_at: string | null
  synced_at: string
  created_at: string
  updated_at: string
  last_message_at?: string | null
  last_message_by?: string | null
  last_message_role?: string | null
  customer_email?: string | null
  customer_name?: string | null
  customer?: Customer
  input_app?: App
  output_app?: App
  messages?: Message[]
  drafts?: Draft[]
}

export interface MessageAttachment {
  id: string
  message_id: string
  tenant_id: string
  external_id: string | null
  file_name: string
  file_type: string | null
  file_size: number | null
  url: string
  content_text: string | null
  created_at: string
}

export interface Message {
  id: string
  ticket_id: string
  tenant_id: string
  external_id: string
  author_role: 'customer' | 'agent' | 'bot' | 'system'
  author_id: string | null
  author_name: string | null
  body: string | null
  attachments?: MessageAttachment[]
  external_created_at: string | null
  created_at: string
}

export interface Draft {
  id: string
  ticket_id: string
  tenant_id: string
  prompt_context: string | null
  draft_response: string
  ai_model: string | null
  ai_tokens_used: number | null
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface EmbeddingStatus {
  total_chunks: number
  embedded_chunks: number
}

export interface KnowledgeArticle {
  id: string
  tenant_id: string
  external_id: string | null
  title: string
  content: string
  category: string | null
  language: string | null
  source_type: 'text' | 'voice'
  metadata: Record<string, unknown>
  is_active: boolean
  embedding_status?: EmbeddingStatus
  created_at: string
  updated_at: string
}

export type TranscriptionStatus = 'pending' | 'transcribing' | 'done' | 'failed'

export interface VoiceRecording {
  id: string
  tenant_id: string
  source_app_id: string
  external_id: string
  audio_url: string | null
  mime_type: string | null
  duration_seconds: number | null
  language: string | null
  caller: string | null
  callee: string | null
  direction: 'inbound' | 'outbound' | null
  customer_id: string | null
  customer?: Customer
  transcription_status: TranscriptionStatus
  transcription_error: string | null
  transcription_attempts: number
  article_id: string | null
  metadata: Record<string, unknown>
  recorded_at: string | null
  transcribed_at: string | null
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface RegisterResponse extends AuthTokens {
  user: User
}

export interface CreateTenantRequest {
  name: string
  slug: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination?: {
    next_cursor: string | null
    has_more: boolean
    total: number
  }
}
