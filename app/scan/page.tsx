'use client'
import { useState, useEffect, useRef, DragEvent, ChangeEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, Package, Activity, Scan, 
  History, User, LogOut, ChevronDown, UploadCloud, RefreshCcw 
} from 'lucide-react'

export default function ScanPage() {
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<{label: string, confidence: number} | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [user] = useState({ fullname: "Muhammad Dimas Ajie", email: "mahasiswa123@gmail.com" })

  // ── LOGIC HANDLERS ──
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const processFile = (selectedFile: File) => {
    if (selectedFile.type.startsWith('image/')) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setResult(null)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) processFile(droppedFile)
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  const resetData = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
  }

  const formatLabel = (label: string) => label.split('_').join(' ')

  const runAnalysis = async () => {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      alert("Koneksi gagal ke server AI")
    } finally {
      setLoading(false)
    }
  }

  const navItemStyle = (path: string) => 
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
      pathname === path 
      ? "bg-green-600 text-white shadow-lg shadow-green-100 translate-x-1" 
      : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
    }`

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* ── SIDEBAR PREMIUM ── */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen shadow-sm z-20">
        <div className="h-20 flex items-center px-8 gap-3 border-b border-slate-50">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
            <Package className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-800">Pantry Vision</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Menu Utama</p>
          <Link href="/dashboard" className={navItemStyle('/dashboard')}>
            <LayoutDashboard size={20}/> <span className="font-bold text-sm tracking-tight">Dashboard</span>
          </Link>
          <Link href="/inventori" className={navItemStyle('/inventori')}>
            <Package size={20}/> <span className="font-bold text-sm tracking-tight">Inventori</span>
          </Link>
          <Link href="/sensor" className={navItemStyle('/sensor')}>
            <Activity size={20}/> <span className="font-bold text-sm tracking-tight">Sensor</span>
          </Link>
          <Link href="/scan" className={navItemStyle('/scan')}>
            <Scan size={20}/> <span className="font-bold text-sm tracking-tight">Scan</span>
          </Link>
          <Link href="/riwayat" className={navItemStyle('/riwayat')}>
            <History size={20}/> <span className="font-bold text-sm tracking-tight">Riwayat Scan</span>
          </Link>
          
          <div className="pt-8 border-t border-slate-50 mt-4">
            <p className="px-4 text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Akun</p>
            <Link href="/profile" className={navItemStyle('/profile')}>
              <User size={20}/> <span className="font-bold text-sm tracking-tight">Profile</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* HEADER WITH PROFILE DROPDOWN */}
        <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tighter">Scan Bahan</h2>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-2.5 p-1 rounded-xl transition-all ${
                isDropdownOpen ? "bg-white shadow-sm ring-1 ring-slate-100" : "bg-slate-50 hover:bg-white"
              }`}
            >
              <div className="w-8 h-8 bg-green-100 text-green-700 font-bold rounded-lg flex items-center justify-center text-xs uppercase shadow-sm">M</div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="flex flex-col items-center text-center px-4 pb-4 border-b border-slate-50 mb-2">
                  <div className="w-12 h-12 bg-green-100 text-green-700 font-black rounded-2xl border-2 border-white flex items-center justify-center text-lg shadow-sm mb-3 uppercase">M</div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Akun Aktif</p>
                  <p className="text-sm font-black text-slate-800 truncate w-full">{user.fullname}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate w-full">{user.email}</p>
                </div>
                <div className="px-2">
                  <button onClick={() => router.push('/login')} className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] group">
                    <LogOut size={14} className="text-red-400 group-hover:text-red-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-10">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center py-8">
            <div className="text-left">
              <h2 className="text-6xl font-black leading-[1.1] mb-6 tracking-tighter text-slate-900">
                Pindai bahan <br/> <span className="text-black-600">makananmu</span> sekarang.
              </h2>
              <p className="text-lg font-bold text-slate-400 mb-8 leading-relaxed">
                Unggah foto untuk melihat tingkat kesegaran bahan secara langsung menggunakan teknologi AI Vision kami.
              </p>
            </div>

            <div className="space-y-6">
              {/* UPLOAD BOX MODIFIED */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative h-[400px] rounded-[3rem] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden shadow-sm group ${
                  isDragging ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'
                } ${preview ? 'border-none ring-4 ring-white shadow-xl' : ''}`}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover animate-in fade-in zoom-in duration-500" />
                ) : (
                  <div className="text-center p-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-green-50 transition-all duration-300">
                        <UploadCloud size={32} className="text-slate-400 group-hover:text-green-500 transition-colors" />
                    </div>
                    <p className="font-black text-xl text-slate-800 tracking-tight">Tarik gambar ke sini</p>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Atau klik area ini untuk memilih file</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleFileInput} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-4">
                <button 
                  onClick={runAnalysis}
                  disabled={!file || loading}
                  className="flex-[2] py-5 bg-slate-900 hover:bg-green-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all disabled:bg-slate-100 disabled:text-slate-300 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCcw className="animate-spin" size={18} /> : 'Mulai Analisis'}
                </button>
                
                {preview && (
                  <button 
                    onClick={resetData}
                    className="flex-1 py-5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* RESULT AREA PREMIUM */}
              {result && (
                <div className="p-8 bg-white rounded-[2.5rem] border border-slate-100 animate-in slide-in-from-bottom duration-500 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-3xl" />
                  <div className="flex justify-between items-center relative z-10">
                    <div className="text-left">
                      <h3 className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em] mb-1">Identifikasi AI</h3>
                      <p className="text-4xl font-black capitalize text-slate-900 tracking-tighter">{formatLabel(result.label)}</p>
                    </div>
                    <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-center">
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Akurasi</span>
                      <span className="text-2xl font-black text-slate-800">{result.confidence}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}