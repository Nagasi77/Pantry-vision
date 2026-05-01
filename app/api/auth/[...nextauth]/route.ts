import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabase } from "../../../lib/supabase"

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
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error || !data.user) {
          console.error("Login Error:", error?.message)
          return null
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single()

        return { 
          id: data.user.id, 
          name: profile?.full_name || data.user.email, 
          email: data.user.email,
          role: "user" 
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role
        token.id = user.id
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

    async signIn({ user, account }: any) {
      // Logika untuk Social Login (OAuth)
      if (account.provider === "google" || account.provider === "github") {

        return true
      }
      return true
    }
  },

  pages: {
    signIn: "/login", 
  },

  session: {
    strategy: "jwt" as const, 
  },

  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }