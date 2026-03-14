import type { Message } from "@/lib/types"

interface Props {
  messages: Message[]
}

export function ActivityLog({ messages }: Props) {
  const textBlocks = messages.flatMap((msg) =>
    msg.content.filter(
      (block): block is { type: "text"; text: string } => block.type === "text"
    )
  )

  if (textBlocks.length === 0) {
    return (
      <p
        className="font-data text-sm cursor-blink"
        style={{ color: "var(--text-ter)" }}
      >
        $ no activity yet
      </p>
    )
  }

  return (
    <ol className="space-y-2">
      {textBlocks.map((block, i) => {
        const isLatest = i === textBlocks.length - 1
        return (
          <li
            key={`${i}-${block.text.slice(0, 32)}`}
            className="flex gap-3 p-3 text-sm"
            style={{
              background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
              borderLeft: isLatest
                ? "2px solid var(--accent)"
                : "2px solid var(--border)",
            }}
          >
            <span
              data-counter
              className="font-data text-xs shrink-0 select-none"
              style={{ color: "var(--accent)", marginTop: "2px" }}
            >
              [{i + 1}]
            </span>
            <span
              className="whitespace-pre-wrap leading-relaxed"
              style={{ color: "var(--text-pri)", fontFamily: "var(--font-sans)" }}
            >
              {block.text}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
