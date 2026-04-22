'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, Package, Activity, Scan, 
  History, User, LogOut, Mail, Lock, Camera, 
  Check, ChevronDown, Eye, EyeOff 
} from 'lucide-react'

export default function ProfilePage() {
  const pathname = usePathname()
  const router = useRouter()
  
  const [isEditing, setIsEditing] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 1. State data tersimpan (Permanen)
  const [user, setUser] = useState({
    fullname: "Muhammad Dimas Ajie",
    email: "mahasiswa123@gmail.com",
    password: "password123",
  })

  // 2. State form (Sementara untuk mengetik)
  const [form, setForm] = useState({ ...user })

  // Menutup dropdown saat klik di luar area profil
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    router.push("/")
  }

  const handleSave = () => {
    setUser({ ...form }) // Simpan data permanen
    setIsEditing(false)
  }

  const handleCancel = () => {
    setForm({ ...user }) // Reset data form ke data asli
    setIsEditing(false)
    setShowPassword(false)
  }

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  const navItemStyle = (path: string) => 
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
      pathname === path 
      ? "bg-green-600 text-white shadow-lg shadow-green-100 translate-x-1" 
      : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
    }`

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen shadow-sm z-20">
        <div className="h-20 flex items-center px-8 gap-3 border-b border-slate-50">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
            <Package className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Pantry Vision</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Menu Utama</p>
          <Link href="/dashboard" className={navItemStyle('/dashboard')}><LayoutDashboard size={20}/> <span>Dashboard</span></Link>
          <Link href="/inventori" className={navItemStyle('/inventori')}><Package size={20}/> <span>Inventori</span></Link>
          <Link href="/sensor" className={navItemStyle('/sensor')}><Activity size={20}/> <span>Sensor</span></Link>
          <Link href="/scan" className={navItemStyle('/scan')}><Scan size={20}/> <span>Scan</span></Link>
          <Link href="/riwayat" className={navItemStyle('/riwayat')}><History size={20}/> <span>Riwayat Scan</span></Link>
          
          <div className="pt-8 border-t border-slate-50 mt-4">
            <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Akun</p>
            <Link href="/profile" className={navItemStyle('/profile')}><User size={20}/> <span>Profile</span></Link>
          </div>
        </nav>
      </aside>

                {/* ── MAIN CONTENT ── */}
                <main className="flex-1 flex flex-col overflow-y-auto">
                  
                  <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 flex items-center justify-between px-10">
                    <h2 className="text-xl font-black text-slate-800 tracking-tighter">Profile</h2>
                    
                  {/* HEADER PROFILE DROPDOWN (Ramping) */}
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`flex items-center gap-2.5 p-1 pr-1 rounded-xl transition-all duration-300 ${
                        isDropdownOpen ? "bg-white shadow-sm ring-1 ring-slate-100" : "bg-slate-50/50 border border-slate-100 hover:bg-white"
                      }`}
                    >
                      <div className="w-8 h-8 bg-green-100 text-green-700 font-bold rounded-lg border border-white flex items-center justify-center text-xs uppercase shadow-sm">
                        {getInitial(user.fullname)}
                      </div>
                    </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-50 py-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      
                      {/* BAGIAN TENGAH (AVATAR & INFO) */}
                      <div className="flex flex-col items-center text-center px-4 pb-4 border-b border-slate-50 mb-2">
                        {/* Avatar Inisial di Tengah */}
                        <div className="w-12 h-12 bg-green-100 text-green-700 font-black rounded-2xl border-2 border-white flex items-center justify-center text-lg uppercase shadow-sm mb-3">
                          {getInitial(user.fullname)}
                        </div>
                  
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Akun Aktif</p>
                  <p className="text-sm font-black text-slate-800 leading-tight">{user.fullname}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate w-full">{user.email}</p>
                </div>
                <div className="px-1.5 space-y-0.5">
                  <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] group"
                  >
                    <LogOut size={14} className="text-red-400 group-hover:text-red-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-12 gap-8">
            
            {/* AVATAR CARD */}
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-green-600" />
                <div className="relative mt-8">
                  <div className="w-32 h-32 mx-auto rounded-[2.5rem] border-4 border-white shadow-2xl bg-slate-50 flex items-center justify-center text-4xl font-black text-green-600">
                    {getInitial(user.fullname)}
                  </div>
                  <button className="absolute bottom-0 right-1/3 translate-x-4 bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-green-600 transition-colors">
                    <Camera size={18} />
                  </button>
                </div>
                <div className="mt-6">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{user.fullname}</h2>
                  <p className="text-sm text-slate-400 font-medium">{user.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
                  <div><p className="text-2xl font-black text-slate-800">10</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bahan</p></div>
                  <div><p className="text-2xl font-black text-slate-800">5</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Scan</p></div>
                </div>
              </div>
            </div>

            {/* DETAIL PROFIL CARD */}
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Detail Profil</h3>
                  {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-2xl font-bold text-[10px] tracking-widest transition-all">
                      EDIT PROFIL
                    </button>
                  ) : (
                    <button onClick={handleCancel} className="px-6 py-2.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-bold text-[10px] tracking-widest transition-all">
                      BATALKAN
                    </button>
                  )}
                </div>

                <div className="space-y-8">
                  <InputField label="Username" icon={<User size={18}/>} value={isEditing ? form.fullname : user.fullname} disabled={!isEditing} onChange={(val: string) => setForm({...form, fullname: val})} />
                  <InputField label="Email" icon={<Mail size={18}/>} value={isEditing ? form.email : user.email} disabled={!isEditing} onChange={(val: string) => setForm({...form, email: val})} />
                  <InputField 
                    label="Password" icon={<Lock size={18}/>} value={isEditing ? form.password : user.password} disabled={!isEditing} 
                    isPassword={true} showPassword={showPassword} togglePassword={() => setShowPassword(!showPassword)}
                    onChange={(val: string) => setForm({...form, password: val})} 
                  />
                </div>

                {isEditing && (
                  <div className="mt-12 flex justify-end">
                    <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-green-200 transition-all active:scale-95 tracking-widest uppercase">
                      <Check size={20} /> Simpan Perubahan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function InputField({ label, icon, value, type = "text", disabled, onChange, isPassword, showPassword, togglePassword }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-green-600 transition-colors">{icon}</div>
        <input 
          type={isPassword ? (showPassword ? "text" : "password") : type}
          disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-12 ${isPassword ? 'pr-12' : 'pr-6'} py-4 rounded-2xl border-2 transition-all outline-none font-bold text-sm ${disabled ? "bg-slate-50/50 border-transparent text-slate-500" : "bg-white border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/5 text-slate-800 shadow-sm"}`}
        />
        {isPassword && !disabled && (
          <button type="button" onClick={togglePassword} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-green-600 transition-colors">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}