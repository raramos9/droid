interface Props {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}

export function DenseListItem({ selected, onClick, children }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? "var(--selection-bg)" : "transparent",
        borderLeft: selected ? "2px solid var(--border-strong)" : "2px solid transparent",
        cursor: "pointer",
        transition: "background var(--transition)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  )
}
