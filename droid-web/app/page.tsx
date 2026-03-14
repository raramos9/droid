import { signIn } from "@/auth"

export default function LandingPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="stagger-item" style={{ "--i": 0 } as React.CSSProperties}>
          <h1
            className="font-display text-6xl font-medium tracking-tight"
            style={{ color: "var(--text-pri)" }}
          >
            dr<span style={{ color: "var(--accent)" }}>o</span>id
          </h1>
        </div>

        <div className="stagger-item" style={{ "--i": 1 } as React.CSSProperties}>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-sec)", fontFamily: "var(--font-sans)" }}
          >
            Autonomous GitHub issue resolution.<br />
            Enroll a repo. Let the agent work.
          </p>
        </div>

        <div className="stagger-item" style={{ "--i": 2 } as React.CSSProperties}>
          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/dashboard" })
            }}
          >
            <button type="submit" className="btn-amber w-full px-6 py-3">
              Sign in with GitHub
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
