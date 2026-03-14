export interface CommandAction {
  id: string
  label: string
  section: "Navigation" | "Repositories" | "Actions"
  shortcut?: string
  onSelect: () => void
}

interface BuildOptions {
  repos: Array<{ owner: string; repo: string }>
  navigate?: (href: string) => void
}

export function buildActions({ repos, navigate = () => {} }: BuildOptions): CommandAction[] {
  const nav: CommandAction[] = [
    {
      id: "nav-dashboard",
      label: "Go to Dashboard",
      section: "Navigation",
      shortcut: "G D",
      onSelect: () => navigate("/dashboard"),
    },
    {
      id: "nav-inbox",
      label: "Go to Inbox",
      section: "Navigation",
      shortcut: "G I",
      onSelect: () => navigate("/dashboard/inbox"),
    },
  ]

  const repoActions: CommandAction[] = repos.map(({ owner, repo }) => ({
    id: `repo-${owner}-${repo}`,
    label: repo,
    section: "Repositories",
    onSelect: () => navigate(`/dashboard/${owner}/${repo}`),
  }))

  return [...nav, ...repoActions]
}

export function filterActions(actions: CommandAction[], query: string): CommandAction[] {
  if (!query) return actions
  const q = query.toLowerCase()
  return actions.filter((a) => a.label.toLowerCase().includes(q))
}
