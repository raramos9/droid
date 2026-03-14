import type { Message } from "@/lib/types"

interface Props {
  messages: Message[]
}

export function ActivityLog({ messages }: Props) {
  const textBlocks = messages.flatMap((msg) => {
    if (typeof msg.content === "string") return []
    return msg.content.filter(
      (block): block is { type: "text"; text: string } => block.type === "text"
    )
  })

  if (textBlocks.length === 0) {
    return (
      <p
        className="text-sm text-center"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
      >
        No activity yet
      </p>
    )
  }

  return (
    <ol>
      {textBlocks.map((block, i) => {
        const isLatest = i === textBlocks.length - 1
        return (
          <li
            key={`${i}-${block.text.slice(0, 32)}`}
            className="flex gap-3 py-3 text-sm"
            style={{
              borderBottom: "1px solid var(--border)",
              borderLeft: isLatest ? "2px solid var(--interactive)" : undefined,
              paddingLeft: isLatest ? "12px" : undefined,
            }}
          >
            <span
              data-counter
              className="font-mono text-xs shrink-0 select-none"
              style={{ color: "var(--text-tertiary)", marginTop: "2px" }}
            >
              {i + 1}.
            </span>
            <span
              className="whitespace-pre-wrap leading-relaxed"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)" }}
            >
              {block.text}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
