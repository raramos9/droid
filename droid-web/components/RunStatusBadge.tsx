import type { AgentRunStatus } from "@/lib/types"

interface DotConfig {
  color: string
  bg: string
  animation?: string
}

const DOT_CONFIG: Record<AgentRunStatus, DotConfig> = {
  pending:   { color: "var(--status-neutral)", bg: "var(--status-neutral-bg)" },
  running:   { color: "var(--status-info)",    bg: "var(--status-info-bg)",    animation: "pulse-subtle 1.5s ease-in-out infinite" },
  paused:    { color: "var(--status-warning)", bg: "var(--status-warning-bg)", animation: "pulse-subtle 2s ease-in-out infinite" },
  completed: { color: "var(--status-success)", bg: "var(--status-success-bg)" },
  failed:    { color: "var(--status-error)",   bg: "var(--status-error-bg)" },
}

interface Props {
  status: AgentRunStatus
  iterationLimitReached?: boolean
}

export function RunStatusBadge({ status, iterationLimitReached }: Props) {
  const isLimitReached = status === "completed" && iterationLimitReached
  const effectiveConfig = isLimitReached
    ? { color: "var(--status-warning)", bg: "var(--status-warning-bg)" }
    : DOT_CONFIG[status]
  const { color, bg, animation } = effectiveConfig

  return (
    <span
      className={`badge font-mono status-${isLimitReached ? "limit-reached" : status}`}
      style={{ background: bg, color }}
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
      {isLimitReached ? "limit reached" : status}
    </span>
  )
}
