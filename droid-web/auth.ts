import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { upsertUserToken } from "@/lib/tokenStore"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    login?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    login?: string
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: { scope: "read:user repo admin:repo_hook" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        const login = (profile as { login?: string } | undefined)?.login
        try {
          if (login) await upsertUserToken(login, account.access_token)
        } catch (err) {
          console.error("Failed to store user token on login:", (err as Error).message)
        }
        return { ...token, accessToken: account.access_token, login }
      }
      return token
    },
    session({ session, token }) {
      return { ...session, accessToken: token.accessToken, login: token.login }
    },
  },
})
