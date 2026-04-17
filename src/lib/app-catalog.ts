import { MessageSquare, GitBranch, Globe, Hash, BookOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CredentialField {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'password' | 'checkbox'
  required?: boolean
  helpText?: string
}

export interface AppDefinition {
  code: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  type: 'ticket' | 'knowledge'
  role: 'source' | 'destination' | 'both'
  category: 'ticket' | 'knowledge'
  credentials: CredentialField[]
  configFields?: CredentialField[]
  comingSoon?: boolean
}

export const APP_CATALOG: Record<string, AppDefinition> = {
  intercom: {
    code: 'intercom',
    name: 'Intercom',
    description: 'Import and respond to customer conversations',
    icon: MessageSquare,
    color: '#1f8ded',
    type: 'ticket',
    role: 'both',
    category: 'ticket',
    credentials: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'Enter your Intercom access token', type: 'password', required: true, helpText: 'Found in Intercom Developer Hub → Your App → Authentication' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Enter your client secret', type: 'password', required: true, helpText: 'Used for webhook signature verification (HMAC-SHA1)' },
    ],
    configFields: [
      { key: 'admin_id', label: 'Admin ID', placeholder: '1234567', type: 'text', required: true, helpText: 'Intercom admin ID used to send replies. Find it in Intercom → Settings → Teammates.' },
      { key: 'send_as_note', label: 'Send as internal note', placeholder: '', type: 'checkbox', helpText: 'Send replies as internal notes instead of customer-visible messages' },
    ],
  },
  github: {
    code: 'github',
    name: 'GitHub',
    description: 'Sync markdown files as knowledge base articles',
    icon: GitBranch,
    color: '#24292e',
    type: 'knowledge',
    role: 'source',
    category: 'knowledge',
    credentials: [
      { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_...', type: 'password', required: true, helpText: 'Needs read access to the repository contents' },
      { key: 'owner', label: 'Repository Owner', placeholder: 'myorg', type: 'text', required: true },
      { key: 'repo', label: 'Repository Name', placeholder: 'docs', type: 'text', required: true },
      { key: 'path', label: 'Path', placeholder: 'guides/', type: 'text', required: true, helpText: 'Directory path to scan for .md files' },
      { key: 'branch', label: 'Branch', placeholder: 'main', type: 'text', helpText: 'Defaults to main if empty' },
    ],
  },
  'web-scraper': {
    code: 'web-scraper',
    name: 'Web Scraper',
    description: 'Crawl websites and import pages as knowledge base articles',
    icon: Globe,
    color: '#0ea5e9',
    type: 'knowledge',
    role: 'source',
    category: 'knowledge',
    credentials: [
      { key: 'url', label: 'Start URL', placeholder: 'https://docs.example.com', type: 'text', required: true, helpText: 'The starting URL to crawl from' },
    ],
    configFields: [
      { key: 'selector', label: 'CSS Selector', placeholder: 'article, main, .content', type: 'text', helpText: 'CSS selector for content extraction. Defaults to article, main, .content' },
      { key: 'max_pages', label: 'Max Pages', placeholder: '50', type: 'text', helpText: 'Maximum number of pages to crawl (default 50, max 200)' },
    ],
  },
  'slack-kb': {
    code: 'slack-kb',
    name: 'Slack KB',
    description: 'Extract knowledge articles from Slack thread discussions',
    icon: Hash,
    color: '#4a154b',
    type: 'knowledge',
    role: 'source',
    category: 'knowledge',
    credentials: [
      { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', type: 'password', required: true, helpText: 'Slack Bot OAuth token with channels:history and channels:read scopes' },
      { key: 'channel_ids', label: 'Channel IDs', placeholder: 'C01ABC123, C02DEF456', type: 'text', required: true, helpText: 'Comma-separated Slack channel IDs to monitor' },
    ],
    configFields: [
      { key: 'min_replies', label: 'Min Replies', placeholder: '2', type: 'text', helpText: 'Minimum replies in a thread to include (default 2)' },
      { key: 'lookback_days', label: 'Lookback Days', placeholder: '30', type: 'text', helpText: 'How many days back to search for threads (default 30)' },
    ],
  },
}

export const APP_CATEGORIES = [
  {
    key: 'ticket' as const,
    label: 'Ticket Management',
    description: 'Connect your support platforms to import and respond to tickets',
    icon: MessageSquare,
  },
  {
    key: 'knowledge' as const,
    label: 'Knowledge Base',
    description: 'Sync content sources to power AI-generated responses',
    icon: BookOpen,
  },
] as const

export function getAppsByCategory(category: string): AppDefinition[] {
  return Object.values(APP_CATALOG).filter((app) => app.category === category)
}
