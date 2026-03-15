import { signIn } from "@/auth"

export default function LandingPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="text-center space-y-8 max-w-sm w-full animate-in">
        <h1
          className="text-6xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-sans)", color: "var(--text-primary)" }}
        >
          droid
        </h1>

        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)" }}
        >
          Autonomous GitHub issue resolution.<br />
          Enroll a repo. Let the agent work.
        </p>

        <form
          action={async () => {
            "use server"
            await signIn("github", { redirectTo: "/dashboard" })
          }}
        >
          <button type="submit" className="btn-primary w-full px-6 py-3">
            Sign in with GitHub
          </button>
        </form>
      </div>
    </main>
  )
}
