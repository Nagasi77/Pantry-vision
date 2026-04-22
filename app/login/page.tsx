"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const target = e.currentTarget
    const email = target.email.value
    const password = target.password.value

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      })

      if (!res?.error) {
        setIsLoading(false)
        router.push(callbackUrl)
      } else {
        setIsLoading(false)
        setError("Email atau password salah")
      }
    } catch (err) {
      setIsLoading(false)
      setError("Terjadi kesalahan sistem")
    }
  }

  return (
    <div className="flex min-h-screen">
      
      {/* SEKSI KIRI - FORM LOGIN */}
      <div className="w-full md:w-1/2 bg-[#0f172a] text-white flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold">
              Pantry<span className="text-blue-500">Vision.</span>
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Silahkan masuk untuk mengakses fitur pemindaian penuh.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm py-3 px-4 rounded-xl mb-4 text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-300">Email</label>
              <input
                name="email"
                type="email"
                placeholder="Masukkan email"
                required
                className="w-full mt-1 px-4 py-3 rounded-full bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">Password</label>
              <input
                name="password"
                type="password"
                placeholder="Masukkan password"
                required
                className="w-full mt-1 px-4 py-3 rounded-full bg-transparent border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-blue-500 py-3 rounded-full font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {isLoading ? "Sedang Memproses..." : "Login"}
            </button>

            {/* TOMBOL GOOGLE - DIMODIFIKASI */}
            <div className="mt-4">
              <div className="relative flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-xs text-gray-500 tracking-widest uppercase">atau</span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>

              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl })}
                className="group relative w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full border border-gray-600 bg-white/5 hover:bg-white/10 hover:border-gray-400 transition-all duration-300 overflow-hidden"
              >
                {/* Shimmer effect */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none" />

                {/* Google Icon SVG */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>

                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                  Lanjutkan dengan Google
                </span>
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <span>Belum punya akun? </span>
            <Link 
              href="/register" 
              className="text-blue-400 hover:text-blue-300 font-medium underline-offset-4 hover:underline"
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* SEKSI KANAN - LANDING INFO */}
      <div className="hidden md:flex w-1/2 bg-gray-50 items-center justify-center relative overflow-hidden">
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-50 z-0"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <div className="w-20 h-20 bg-gray-900 rounded-[2rem] mb-10 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-all duration-500">
            <div className="w-8 h-8 bg-blue-500 rounded-lg animate-pulse"></div>
          </div> 

          <h1 className="text-5xl font-black text-gray-900 mb-6 tracking-tighter">
            Pantry<span className="text-blue-600">Vision.</span>
          </h1>

          <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
            Mendeteksi kesegaran bahan makanan dengan Computer Vision. Dibangun dengan metodologi <span className="font-bold">PULP</span> untuk hasil yang presisi.
          </p>

          <div className="flex justify-center gap-10 mt-12 text-sm text-gray-500">
            <div>
              <h2 className="text-xl font-bold text-black">98%</h2>
              Akurasi
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">0.5s</h2>
              Inference
            </div>
            <div>
              <h2 className="text-xl font-bold text-black">2026</h2>
              Tech Stack
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}