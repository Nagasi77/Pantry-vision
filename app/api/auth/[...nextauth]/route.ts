import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from "@supabase/supabase-js"

// Gunakan service role key agar bisa insert ke profiles
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error || !data.user) return null

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single()

        return {
          id: data.user.id,
          name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email,
          email: data.user.email,
          role: "user"
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account }: any) {
      // Hanya proses auto-create profile untuk OAuth providers
      if (account?.provider === "google" || account?.provider === "github") {
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!existingProfile) {
          // Auto-create profile baru untuk user OAuth
          await supabaseAdmin
            .from('profiles')
            .insert({
              email: user.email,
              full_name: user.name,
              avatar_url: user.image,
            })
        }
      }
      return true
    },

    async jwt({ token, user, account }: any) {
      if (user) {
        token.role = user.role || "user"

        // Ambil UUID dari profiles berdasarkan email
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single()

        token.id = profile?.id || user.id
      }
      return token
    },

    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role
        session.user.id = token.id
      }
      return session
    },
  },

  pages: {
    signIn: "/auth/login",  // ✅ fix path
  },

  session: {
    strategy: "jwt" as const,
  },

  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }