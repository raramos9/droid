import type { Metadata } from "next"
import { DM_Sans, Fira_Code } from "next/font/google"
import Script from "next/script"
import "./globals.css"

const dmSans = DM_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
})

const firaCode = Fira_Code({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "droid",
  description: "AI-powered GitHub issue resolution",
}

const themeScript = `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${firaCode.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  )
}
