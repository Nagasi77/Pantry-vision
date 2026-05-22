"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) return setError("Password minimal 8 karakter")
    
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
      })

      if (res.ok) {
        router.push("/auth/login")
      } else {
        const data = await res.json()
        setError(data.message || "Gagal mendaftarkan akun.")
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl py-10 px-6 shadow-2xl border border-white/5 sm:rounded-[2.5rem] sm:px-12 w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter">
          Pantry<span className="text-green-500">Vision.</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400 font-medium">Buat akun baru Anda</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Input Username */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
          <input 
            type="text" required 
            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-slate-700 text-white text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all"
            value={form.username}
            onChange={e => setForm({...form, username: e.target.value})}
          />
        </div>
        
        {/* Input Email */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
          <input 
            type="email" required 
            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-slate-700 text-white text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
          />
        </div>

        {/* Input Password */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
          <input 
            type="password" required 
            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-slate-700 text-white text-sm font-bold focus:ring-2 focus:ring-green-500 outline-none transition-all"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
          />
        </div>

        <button 
          disabled={isLoading}
          className="w-full mt-4 bg-green-600 py-4 rounded-2xl font-black text-sm text-white shadow-xl hover:bg-green-500 transition-all disabled:opacity-50 uppercase tracking-widest"
        >
          {isLoading ? "Memproses..." : "Daftar Akun"}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-400">
        Sudah punya akun? <Link href="/auth/login" className="text-green-400 font-black underline underline-offset-4">Masuk</Link>
      </div>
    </div>
  )
}