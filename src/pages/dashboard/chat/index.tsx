import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Bot, BookOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import api from '@/lib/api'

interface Source {
  chunk_id: string
  article_id: string
  content: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  tokens_used?: number | null
  timestamp: Date
}

interface ChatResponse {
  answer: string | { data?: { response?: string }; meta?: { code?: string } }
  sources?: Source[]
  tokens_used?: number | null
}

function extractAnswer(answer: ChatResponse['answer']): string {
  if (typeof answer === 'string') return answer
  return answer?.data?.response ?? 'No response received.'
}

function stripUrls(text: string): string {
  return text
    .replace(/\[(?:Image|image|img)\s+"[^"]*"\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[[^\]]*\]\(https?:\/\/[^)]+\)/g, (match) => {
      const label = match.match(/\[([^\]]*)\]/)?.[1]
      return label || ''
    })
    .replace(/https?:\/\/[^\s)}\]"]+/g, '')
    .replace(/www\.[^\s)}\]"]+/g, '')
    .replace(/[^\s]{60,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function ChatPage() {
  const { tenantId } = useParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const { data } = await api.post<ChatResponse>(`/tenants/${tenantId}/chat`, {
        question: text,
        history,
      })
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: extractAnswer(data.answer),
        sources: data.sources,
        tokens_used: data.tokens_used,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please check that your AI service is configured in Settings.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as unknown as FormEvent)
    }
  }

  const clearChat = () => {
    setMessages([])
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Chat"
        description="Test your knowledge base by chatting with the AI agent"
        actions={
          messages.length > 0 ? (
            <Button variant="outline" size="sm" onClick={clearChat}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Clear Chat
            </Button>
          ) : undefined
        }
      />

      <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <Bot className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="mt-4 text-sm font-medium">Test Your Knowledge Base</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Ask questions as if you were a customer. The AI will respond using your
                knowledge base articles to help you verify content coverage.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end pl-12' : 'justify-start pr-12'}`}>
                    <div
                      className={`min-w-0 max-w-full rounded-2xl px-4 py-2.5 ${
                        isUser
                          ? 'rounded-br-sm bg-primary text-primary-foreground'
                          : 'rounded-bl-sm bg-muted'
                      }`}
                      style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                    >
                      <div className="prose prose-sm max-w-none overflow-hidden [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: stripUrls(msg.content) }} />
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 border-t border-border/30 pt-2">
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <BookOpen className="h-3 w-3 shrink-0" /> {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                          </p>
                          <div className="space-y-1">
                            {msg.sources.map((src) => (
                              <div key={src.chunk_id} className="rounded bg-background/50 px-2 py-1 text-[11px] text-muted-foreground" style={{ overflowWrap: 'anywhere' }}>
                                {src.content.length > 120 ? src.content.slice(0, 120) + '...' : src.content}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className={`mt-1 flex items-center gap-2 ${isUser ? 'justify-end' : ''}`}>
                        {msg.tokens_used != null && (
                          <span className="text-[10px] opacity-40">{msg.tokens_used} tokens</span>
                        )}
                        <span className="text-[10px] opacity-40">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {loading && (
                <div className="flex w-full justify-start pr-12">
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                    <Spinner className="h-4 w-4" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t p-4">
          <form onSubmit={sendMessage} className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question to test your knowledge base..."
              rows={1}
              className="min-w-0 flex-1 resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-glow"
              disabled={loading}
            />
            <Button type="submit" size="icon" className="h-auto shrink-0 px-4" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
