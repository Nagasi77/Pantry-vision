'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  User, Mail, Lock, Camera, Check, Eye, EyeOff, Loader2 
} from 'lucide-react'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // State form untuk menampung input saat edit
  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "••••••••", // Password biasanya tidak dikirim dari provider auth untuk keamanan
  })

  // Sinkronisasi data saat session berhasil dimuat
  useEffect(() => {
    if (session?.user) {
      setForm({
        fullname: session.user.name || "",
        email: session.user.email || "",
        password: "••••••••",
      })
    }
  }, [session])

  if (status === "loading") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  const handleSave = () => {
    // Di sini nantinya kamu bisa tambahkan logic API update profile
    console.log("Simpan data baru:", form)
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (session?.user) {
      setForm({
        fullname: session.user.name || "",
        email: session.user.email || "",
        password: "••••••••",
      })
    }
    setIsEditing(false)
    setShowPassword(false)
  }

  const getInitial = (name: string) => (name ? name.charAt(0).toUpperCase() : "?")

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-12 gap-8">
        
        {/* AVATAR CARD */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-green-600" />
            <div className="relative mt-8">
              <div className="w-32 h-32 mx-auto rounded-[2.5rem] border-4 border-white shadow-2xl bg-slate-50 flex items-center justify-center text-4xl font-black text-green-600 overflow-hidden">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  getInitial(form.fullname)
                )}
              </div>
              <button className="absolute bottom-0 right-1/3 translate-x-4 bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-green-600 transition-colors">
                <Camera size={18} />
              </button>
            </div>
            <div className="mt-6 text-center">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">{form.fullname}</h2>
              <p className="text-sm text-slate-400 font-medium">{form.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
              <div>
                <p className="text-2xl font-black text-slate-800">10</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bahan</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-800">5</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Scan</p>
              </div>
            </div>
          </div>
        </div>

        {/* DETAIL PROFIL CARD */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Detail Profil</h3>
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="px-6 py-2.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-2xl font-bold text-[10px] tracking-widest transition-all"
                >
                  EDIT PROFIL
                </button>
              ) : (
                <button 
                  onClick={handleCancel} 
                  className="px-6 py-2.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-bold text-[10px] tracking-widest transition-all"
                >
                  BATALKAN
                </button>
              )}
            </div>

            <div className="space-y-8">
              <InputField 
                label="Full Name" 
                icon={<User size={18}/>} 
                value={form.fullname} 
                disabled={!isEditing} 
                onChange={(val: string) => setForm({...form, fullname: val})} 
              />
              <InputField 
                label="Email Address" 
                icon={<Mail size={18}/>} 
                value={form.email} 
                disabled={true} // Email biasanya tidak diubah jika login via Google/OAuth
                onChange={(val: string) => setForm({...form, email: val})} 
              />
              <InputField 
                label="Password" 
                icon={<Lock size={18}/>} 
                value={form.password} 
                disabled={!isEditing} 
                isPassword={true} 
                showPassword={showPassword} 
                togglePassword={() => setShowPassword(!showPassword)}
                onChange={(val: string) => setForm({...form, password: val})} 
              />
            </div>

            {isEditing && (
              <div className="mt-12 flex justify-end">
                <button 
                  onClick={handleSave} 
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-green-200 transition-all active:scale-95 tracking-widest uppercase"
                >
                  <Check size={20} /> Simpan Perubahan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InputField({ label, icon, value, type = "text", disabled, onChange, isPassword, showPassword, togglePassword }: any) {
  return (
    <div className="space-y-2 group text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-green-600 transition-colors">
          {icon}
        </div>
        <input 
          type={isPassword ? (showPassword ? "text" : "password") : type}
          disabled={disabled} 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-12 ${isPassword ? 'pr-12' : 'pr-6'} py-4 rounded-2xl border-2 transition-all outline-none font-bold text-sm ${
            disabled 
              ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed" 
              : "bg-white border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/5 text-slate-800 shadow-sm"
          }`}
        />
        {isPassword && !disabled && (
          <button 
            type="button" 
            onClick={togglePassword} 
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-green-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}