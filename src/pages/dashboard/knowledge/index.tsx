import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Zap, Loader2, Sparkles } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import api from '@/lib/api'
import type { KnowledgeArticle, PaginatedResponse, EmbeddingStatus } from '@/types/api'
import KnowledgeArticleModal from './article-modal'

const PAGE_SIZE = 20

function EmbeddingBadge({ status }: { status?: EmbeddingStatus }) {
  if (!status || status.total_chunks === 0) {
    return <Badge variant="secondary" className="text-xs">No chunks</Badge>
  }
  if (status.embedded_chunks === status.total_chunks) {
    return <Badge variant="success" className="text-xs">{status.embedded_chunks}/{status.total_chunks} embedded</Badge>
  }
  if (status.embedded_chunks === 0) {
    return <Badge variant="warning" className="text-xs">Not embedded</Badge>
  }
  return <Badge variant="warning" className="text-xs">{status.embedded_chunks}/{status.total_chunks} embedded</Badge>
}

export default function KnowledgeBasePage() {
  const { tenantId } = useParams()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-articles', tenantId, search, page],
    queryFn: () =>
      api
        .get<PaginatedResponse<KnowledgeArticle>>(`/tenants/${tenantId}/knowledge-articles`, {
          params: {
            limit: PAGE_SIZE,
            page,
            ...(search && { search }),
          },
        })
        .then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenants/${tenantId}/knowledge-articles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge-articles', tenantId] }),
  })

  const embedMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<{ article_id: string; processed: number; failed: number; embedding_status: EmbeddingStatus }>(
        `/tenants/${tenantId}/knowledge-articles/${id}/embed`,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge-articles', tenantId] }),
  })

  const embedAllMutation = useMutation({
    mutationFn: () =>
      api.post<{ processed: number; failed: number; pending: number }>(
        `/tenants/${tenantId}/knowledge-articles/embed`,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge-articles', tenantId] }),
  })

  const generateFromTicketsMutation = useMutation({
    mutationFn: () =>
      api.post<{ processed: number; skipped: number; failed: number; total: number }>(
        `/tenants/${tenantId}/knowledge-articles/generate-from-tickets`,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge-articles', tenantId] }),
  })

  const articles = data?.data ?? []
  const total = data?.pagination?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasUnembedded = articles.some(
    (a) => a.embedding_status && a.embedding_status.embedded_chunks < a.embedding_status.total_chunks,
  )

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Manage articles used by the AI to generate accurate draft responses"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => generateFromTicketsMutation.mutate()}
              disabled={generateFromTicketsMutation.isPending}
            >
              {generateFromTicketsMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate from Tickets</>
              )}
            </Button>
            {hasUnembedded && (
              <Button
                variant="outline"
                onClick={() => embedAllMutation.mutate()}
                disabled={embedAllMutation.isPending}
              >
                {embedAllMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Embedding...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> Embed All</>
                )}
              </Button>
            )}
            <Button onClick={() => { setEditingArticle(null); setShowModal(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Article
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : !articles.length ? (
        <div className="py-12 text-center text-muted-foreground">
          {search ? 'No articles match your search.' : 'No knowledge articles yet.'}
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Language</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Embedding</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => {
                  const isEmbedding = embedMutation.isPending && embedMutation.variables === article.id
                  const fullyEmbedded = article.embedding_status &&
                    article.embedding_status.total_chunks > 0 &&
                    article.embedding_status.embedded_chunks === article.embedding_status.total_chunks
                  return (
                    <tr key={article.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{article.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{article.category ?? '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{article.language ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={article.is_active ? 'success' : 'secondary'}>
                          {article.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <EmbeddingBadge status={article.embedding_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {!fullyEmbedded && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => embedMutation.mutate(article.id)}
                              disabled={isEmbedding}
                              title="Generate embeddings"
                            >
                              {isEmbedding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Zap className="h-4 w-4 text-warning" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingArticle(article); setShowModal(true) }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <ConfirmDialog
                            title="Delete article?"
                            message={`"${article.title}" will be permanently deleted.`}
                            confirmLabel="Delete"
                            onConfirm={() => deleteMutation.mutate(article.id)}
                          >
                            {(open) => (
                              <Button variant="ghost" size="icon" onClick={open}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </ConfirmDialog>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total > 0
                ? `Page ${page} of ${totalPages} — ${total} article${total !== 1 ? 's' : ''}`
                : `${articles.length} articles`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <KnowledgeArticleModal
          article={editingArticle}
          tenantId={tenantId!}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
