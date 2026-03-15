export function timeAgo(dateString: string, now?: Date): string {
  const date = new Date(dateString)
  const reference = now ?? new Date()
  const seconds = Math.floor((reference.getTime() - date.getTime()) / 1000)

  if (seconds < 60) {
    return "just now"
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 23) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }

  if (hours < 48) {
    return "yesterday"
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days} days ago`
  }

  if (days < 14) {
    return "last week"
  }

  const weeks = Math.floor(days / 7)
  if (weeks < 4) {
    return `${weeks} weeks ago`
  }

  const months = Math.floor(days / 30)
  if (months < 2) {
    return "last month"
  }
  if (months < 12) {
    return `${months} months ago`
  }

  const years = Math.floor(months / 12)
  return years === 1 ? "1 year ago" : `${years} years ago`
}
