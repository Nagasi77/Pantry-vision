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
        router.push("/login")
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
    <div className="bg-slate-900/50 backdrop-blur-xl py-10 px-6 shadow-2xl border border-white/5 sm:rounded-[2.5rem] sm:px-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-tighter">
          Pantry<span className="text-green-500">Vision.</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">Buat akun baru Anda</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl text-red-500 text-xs font-bold text-center uppercase tracking-widest">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Username</label>
          <input
            type="text"
            required
            className="block w-full px-5 py-4 rounded-2xl bg-white/5 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            value={form.username}
            onChange={e => setForm({...form, username: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Email</label>
          <input
            type="email"
            required
            className="block w-full px-5 py-4 rounded-2xl bg-white/5 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Password</label>
          <input
            type="password"
            required
            className="block w-full px-5 py-4 rounded-2xl bg-white/5 border border-slate-700 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
          />
        </div>

        <button
          disabled={isLoading}
          className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-green-900/20 text-sm font-black text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {isLoading ? "Memproses..." : "Daftar Akun"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-400">
          Sudah punya akun?{" "}
          <Link href="/auth/login" className="font-black text-green-400 hover:text-green-300 underline underline-offset-4 transition-colors">
            Masuk Disini
          </Link>
        </p>
      </div>
    </div>
  )
}