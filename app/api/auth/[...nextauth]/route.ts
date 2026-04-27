import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { signIn as firebaseSignIn, signInWithGoogle } from "../../../lib/service"
import bcrypt from "bcryptjs"

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
        
        const user: any = await firebaseSignIn(credentials.email)
        
        if (user && user.password) {
          const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password)
          if (isPasswordCorrect) {
            return { 
              id: user.id, 
              name: user.username, 
              email: user.email, 
              role: user.role || "user" // Default role jika tidak ada
            }
          }
        }
        return null
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role
      }
      return token
    },
  
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role
      }
      return session
    },

    async signIn({ user, account }: any) {
      if (account.provider === "google" || account.provider === "github") {
        const data = {
          email: user.email,
          username: user.name,
          image: user.image,
        }

        try {
          await signInWithGoogle(data, (result: any) => {
            return result.status
          })
          return true
        } catch (error) {
          console.error("Gagal sinkronisasi data ke Firebase:", error)
          return true 
        }
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