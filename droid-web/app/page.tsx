import { signIn } from "@/auth"

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="text-center space-y-6 max-w-sm">
        <h1 className="text-4xl font-bold tracking-tight text-white">droid</h1>
        <p className="text-zinc-400 text-base">
          AI-powered GitHub issue resolution. Enroll a repo, let droid do the work.
        </p>
        <form
          action={async () => {
            "use server"
            await signIn("github", { redirectTo: "/dashboard" })
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Sign in with GitHub
          </button>
        </form>
      </div>
    </main>
  )
}
