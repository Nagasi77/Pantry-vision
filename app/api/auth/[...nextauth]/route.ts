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
        
        // 1. Sign in ke Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error || !data.user) {
          // Log ini akan muncul di terminal VS Code Anda
          console.error("Login Error:", error?.message)
          return null
        }

        // 2. Ambil metadata dari tabel profiles (berdasarkan image_1b50e4.png)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.user.id)
          .single()

        // 3. Kembalikan objek user untuk session NextAuth
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
    async jwt({ token, user, account }: any) {
      if (user) {
        token.role = user.role || "user"
        token.id = user.id

        // Jika login via Google, kita perlu mencari UUID di Supabase
        if (account?.provider === 'google') {
          // Cari profile berdasarkan email
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('full_name', user.name) // Fallback sementara jika email belum ada di profiles
            .single()

          if (profile) {
            token.id = profile.id
          } else {
            // Jika tidak ada profile, buat baru (Opsional: tergantung kebijakan app Anda)
            // Untuk sekarang, kita coba ambil data dari auth.users via RPC atau service key jika ada
            // Namun karena hanya ada anon key, kita gunakan logika pencocokan nama atau email jika kolomnya ada
          }
        }
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
      if (account?.provider === "google") {
        // Cek apakah profile sudah ada
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('full_name', user.name)
          .single()

        if (!profile) {
          // Jika Anda ingin otomatis membuat profile baru saat login Google, 
          // Anda memerlukan Service Role Key karena Anon Key biasanya tidak diizinkan Insert ke Profiles 
          // jika belum ada di auth.users. 
          // Untuk saat ini, kita biarkan return true agar user bisa login, 
          // tapi Dashboard mungkin akan kosong jika UUID tidak ditemukan.
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