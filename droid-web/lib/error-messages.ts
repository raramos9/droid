export function mapSupabaseError(
  error: { code?: string; message?: string } | null | undefined
): string {
  switch (error?.code) {
    case "23505": return "This repository is already enrolled."
    case "23503": return "Referenced resource not found."
    case "42501": return "Permission denied."
    default: return "An unexpected error occurred. Please try again."
  }
}
