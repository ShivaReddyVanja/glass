import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Force dynamic rendering for NextAuth routes
export const dynamic = 'force-dynamic'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account && user) {
        token.accessToken = account.access_token
        // Use Google's sub (subject) as the user ID, or generate one
        token.userId = user.id || `google_${account.providerAccountId}`
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      session.accessToken = token.accessToken
      session.userId = token.userId
      // Also set the user ID on the user object for consistency
      if (session.user && token.userId) {
        (session.user as any).id = token.userId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
})

export { handler as GET, handler as POST } 