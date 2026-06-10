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
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
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
      // Auto-create profile untuk user Google OAuth
      if (account?.provider === "google") {
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!existingProfile) {
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

    async jwt({ token, user, account, trigger, session }: any) {
      if (user) {
        token.role = user.role || "user"

        // Ambil UUID dan avatar_url dari profiles berdasarkan email
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, avatar_url')
          .eq('email', user.email)
          .single()

        token.id = profile?.id || user.id
        // Simpan avatar: dari profiles > dari OAuth provider
        token.picture = profile?.avatar_url || user.image || token.picture || null
      }

      // Saat session di-update manual via update() dari client
      if (trigger === "update" && session) {
        if (session.image) token.picture = session.image
        if (session.name) token.name = session.name
      }

      return token
    },

    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role
        session.user.id = token.id
        // Selalu sync image dari token agar konsisten di semua halaman
        if (token.picture) session.user.image = token.picture
      }
      return session
    },
  },

  pages: {
    signIn: "/auth/login",
  },

  session: {
    strategy: "jwt" as const,
  },

  // Wajib untuk deployment di Vercel/proxy agar redirect URI pakai https://
  useSecureCookies: process.env.NODE_ENV === "production",

  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }