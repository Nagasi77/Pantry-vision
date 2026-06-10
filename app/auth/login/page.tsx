"use client"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const target = e.currentTarget
    const email = (target.elements.namedItem("email") as HTMLInputElement).value
    const password = (target.elements.namedItem("password") as HTMLInputElement).value

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    })

    if (!res?.error) {
      router.push(callbackUrl)
      router.refresh()
    } else {
      setIsLoading(false)
      setError("Email atau password salah")
    }
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl py-10 px-6 shadow-2xl border border-white/5 sm:rounded-[2.5rem] sm:px-12 w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
          Pantry<span className="text-green-500">Vision.</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400 font-medium italic">Silahkan masuk ke akun Anda</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-500 text-xs font-bold text-center uppercase tracking-widest">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="nama@email.com"
            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-sm"
          />
        </div>

        {/* Password + toggle */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              className="w-full px-6 py-4 pr-14 rounded-2xl bg-white/5 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-green-400 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          disabled={isLoading}
          className="w-full mt-2 bg-green-600 py-4 rounded-2xl font-black text-sm text-white shadow-xl shadow-green-900/20 hover:bg-green-500 transition-all disabled:opacity-50 uppercase tracking-widest"
        >
          {isLoading ? "Memproses..." : "Masuk"}
        </button>

        <div className="relative flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-slate-800"></div>
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Atau</span>
          <div className="flex-1 h-px bg-slate-800"></div>
        </div>

        {/* Social Login */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="group relative flex items-center justify-center gap-2 py-3 px-6 rounded-2xl border border-slate-700 bg-white/5 hover:bg-white/10 transition-all overflow-hidden"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            </svg>
            <span className="text-sm font-bold text-slate-300">Sign in with Google</span>
          </button>
        </div>
      </form>

      <div className="mt-8 text-center text-sm text-slate-400 font-medium">
        Belum punya akun?{" "}
        <Link href="/auth/register" className="text-green-400 hover:text-green-300 font-black underline underline-offset-4">
          Daftar Sekarang
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-white font-black uppercase tracking-[0.3em]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
