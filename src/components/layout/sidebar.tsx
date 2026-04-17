import { NavLink, useParams } from 'react-router-dom'
import {
  LayoutDashboard,
  Puzzle,
  Ticket,
  BookOpen,
  Users,
  Settings,
  FileText,
  UserCircle,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-context'

const mainNav = [
  { to: '', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: 'apps', icon: Puzzle, label: 'Apps' },
  { to: 'tickets', icon: Ticket, label: 'Tickets' },
  { to: 'customers', icon: UserCircle, label: 'Customers' },
  { to: 'knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { to: 'drafts', icon: FileText, label: 'Drafts' },
  { to: 'chat', icon: MessageCircle, label: 'Chat' },
]

const settingsNav = [
  { to: 'users', icon: Users, label: 'Users', roles: ['owner', 'admin'] },
  { to: 'settings', icon: Settings, label: 'Settings', roles: ['owner', 'admin'] },
]

function getInitials(nameOrEmail: string): string {
  const source = nameOrEmail.trim()
  if (source.includes('@')) return source[0]?.toUpperCase() ?? '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]![0]!.toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function Sidebar() {
  const { tenantId } = useParams()
  const { activeRole, user, logout } = useAuth()

  const filterByRole = (items: typeof settingsNav) =>
    items.filter((item) => !item.roles || (activeRole && item.roles.includes(activeRole)))

  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-[var(--header-height)] items-center gap-2.5 px-5">
        <img src="/logo-icon.svg" alt="Yengec" className="h-7 w-7" />
        <span className="text-sm font-bold tracking-tight">Support AI</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={`/t/${tenantId}/${item.to}`}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-bold transition-all duration-200',
                isActive
                  ? 'bg-[#fff1ea] text-[#f33c42]'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[#f33c42]" />
                )}
                <item.icon className={cn('h-4 w-4', isActive && 'text-[#f33c42]')} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {filterByRole(settingsNav).length > 0 && (
        <div className="border-t border-sidebar-border px-3 py-3">
          <div className="space-y-0.5">
            {filterByRole(settingsNav).map((item) => (
              <NavLink
                key={item.to}
                to={`/t/${tenantId}/${item.to}`}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-bold transition-all duration-200',
                    isActive
                      ? 'bg-[#fff1ea] text-[#f33c42]'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[#f33c42]" />
                    )}
                    <item.icon className={cn('h-4 w-4', isActive && 'text-[#f33c42]')} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {user && (
        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-4 py-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1ea] text-[12px] font-bold text-[#f33c42]"
            title={user.email}
          >
            {getInitials(user.name || user.email)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-sidebar-foreground" title={user.email}>
              {user.name || user.email}
            </div>
            <button
              onClick={logout}
              className="cursor-pointer text-[11px] font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-[#f33c42]"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
