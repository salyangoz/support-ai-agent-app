import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Mic, RotateCcw, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import api from '@/lib/api'
import type { PaginatedResponse, VoiceRecording } from '@/types/api'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'transcribing', label: 'Transcribing' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
]

function statusBadgeVariant(status: VoiceRecording['transcription_status']) {
  switch (status) {
    case 'done':
      return 'success' as const
    case 'failed':
      return 'destructive' as const
    case 'transcribing':
      return 'warning' as const
    default:
      return 'secondary' as const
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '-'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default function VoiceRecordingsPage() {
  const { tenantId } = useParams()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['voice-recordings', tenantId, status],
    queryFn: () =>
      api
        .get<PaginatedResponse<VoiceRecording>>(`/tenants/${tenantId}/voice-recordings`, {
          params: { limit: 50, ...(status && { status }) },
        })
        .then((r) => r.data),
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tenants/${tenantId}/voice-recordings/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['voice-recordings', tenantId] }),
  })

  const recordings = data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Voice Recordings"
        description="Call recordings pulled from voice apps; transcribed into the knowledge base by your active transcription app."
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : !recordings.length ? (
        <div className="py-12 text-center text-muted-foreground">No voice recordings yet.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Recorded</th>
                <th className="px-4 py-3 font-medium">Caller</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Audio</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Article</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec) => (
                <tr key={rec.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(rec.recorded_at ?? rec.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{rec.caller ?? '-'}</span>
                      {rec.direction && (
                        <Badge variant="secondary" className="text-xs">{rec.direction}</Badge>
                      )}
                    </div>
                    {rec.customer && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Matched: {rec.customer.name ?? rec.customer.email ?? rec.customer.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDuration(rec.duration_seconds)}</td>
                  <td className="px-4 py-3">
                    {rec.audio_url ? (
                      <audio
                        controls
                        preload="none"
                        src={rec.audio_url}
                        className="h-8 max-w-[240px]"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(rec.transcription_status)}>
                      {rec.transcription_status}
                    </Badge>
                    {rec.transcription_status === 'failed' && rec.transcription_error && (
                      <div className="text-xs text-destructive mt-0.5 max-w-xs truncate" title={rec.transcription_error}>
                        {rec.transcription_error}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rec.article_id ? (
                      <Link
                        to={`/t/${tenantId}/knowledge`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        View
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {rec.transcription_status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryMutation.mutate(rec.id)}
                        disabled={retryMutation.isPending && retryMutation.variables === rec.id}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
