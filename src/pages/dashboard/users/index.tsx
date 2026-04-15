import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { Spinner } from '@/components/ui/spinner'
import { tokens } from '@/lib/design-tokens'
import { useAuth } from '@/context/auth-context'
import api from '@/lib/api'
import type { TenantUser } from '@/types/api'

const roleColors = tokens.colors.role

export default function UsersPage() {
  const { tenantId } = useParams()
  const { activeRole } = useAuth()
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', password: '', role: 'member' })
  const [inviteError, setInviteError] = useState('')

  const { data: rawUsers, isLoading } = useQuery({
    queryKey: ['users', tenantId],
    queryFn: () => api.get<TenantUser[] | { data: TenantUser[] }>(`/tenants/${tenantId}/users`).then((r) => r.data),
  })

  const users = Array.isArray(rawUsers) ? rawUsers : rawUsers?.data ?? []

  const inviteMutation = useMutation({
    mutationFn: (data: Record<string, string>) => api.post(`/tenants/${tenantId}/users`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] })
      setShowInvite(false)
      setInviteForm({ email: '', name: '', password: '', role: 'member' })
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setInviteError(message ?? 'Failed to invite user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/tenants/${tenantId}/users/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', tenantId] }),
  })

  return (
    <div>
      <PageHeader
        title="Team Members"
        description="Manage who has access to this tenant"
        actions={
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="mr-2 h-4 w-4" /> Invite User
          </Button>
        }
      />

      {showInvite && (
        <div className="mb-6 rounded-lg border p-4">
          <h3 className="mb-3 font-medium">Invite New Member</h3>
          {inviteError && (
            <div className="mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{inviteError}</div>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@company.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input
                type="password"
                value={inviteForm.password}
                onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Temp password"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => inviteMutation.mutate(inviteForm)}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : (
        <div className="rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {activeRole === 'owner' && <th className="px-4 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((tu) => (
                <tr key={tu.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{tu.user?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tu.user?.email ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      style={{
                        backgroundColor: `${roleColors[tu.role]}20`,
                        color: roleColors[tu.role],
                      }}
                    >
                      {tu.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={tu.is_active ? 'success' : 'secondary'}>
                      {tu.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {activeRole === 'owner' && (
                    <td className="px-4 py-3 text-right">
                      {tu.role !== 'owner' && (
                        <ConfirmDialog
                          title="Remove user?"
                          message={`${tu.user?.name ?? tu.user?.email ?? 'This user'} will lose access to this tenant.`}
                          confirmLabel="Remove"
                          onConfirm={() => deleteMutation.mutate(tu.user_id)}
                        >
                          {(open) => (
                            <Button variant="ghost" size="icon" onClick={open}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </ConfirmDialog>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
