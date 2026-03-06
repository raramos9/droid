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
      <p className="text-sm text-zinc-500 italic">No activity yet.</p>
    )
  }

  return (
    <ol className="space-y-3">
      {textBlocks.map((block, i) => (
        <li key={`${i}-${block.text.slice(0, 32)}`} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800 whitespace-pre-wrap">
          {block.text}
        </li>
      ))}
    </ol>
  )
}
