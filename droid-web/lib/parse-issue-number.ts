export function parseIssueNumber(raw: string): number | null {
  const n = parseInt(raw, 10)
  if (isNaN(n) || n <= 0) return null
  return n
}
