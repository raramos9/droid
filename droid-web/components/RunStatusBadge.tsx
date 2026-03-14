import type { AgentRunStatus } from "@/lib/types"

interface DotConfig {
  color: string
  animation?: string
}

const DOT_CONFIG: Record<AgentRunStatus, DotConfig> = {
  pending:   { color: "var(--text-ter)" },
  running:   { color: "var(--blue)", animation: "pulse-dot 1.5s ease-in-out infinite" },
  paused:    { color: "var(--yellow)", animation: "pulse-slow 2s ease-in-out infinite" },
  completed: { color: "var(--green)" },
  failed:    { color: "var(--red)" },
}

const STATUS_CLASS: Record<AgentRunStatus, string> = {
  pending:   "status-pending",
  running:   "status-running",
  paused:    "status-paused",
  completed: "status-completed",
  failed:    "status-failed",
}

interface Props {
  status: AgentRunStatus
}

export function RunStatusBadge({ status }: Props) {
  const { color, animation } = DOT_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${STATUS_CLASS[status]}`}
      style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text-sec)" }}
    >
      <span
        data-dot
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
          animation,
        }}
      />
      {status}
    </span>
  )
}
