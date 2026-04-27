'use client'
import { useState, useRef, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

export default function Header() {
  const { data: session } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitial = (name: string) => name?.charAt(0).toUpperCase() || 'U'

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 flex items-center justify-between px-10">
      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Dashboard</h2>
      
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2.5 p-1 rounded-xl transition-all ${
            isDropdownOpen ? "bg-white shadow-sm ring-1 ring-slate-100" : "bg-slate-50/50 border border-slate-100 hover:bg-white"
          }`}
        >
          <div className="w-8 h-8 bg-green-100 text-green-700 font-bold rounded-lg border border-white flex items-center justify-center text-xs uppercase shadow-sm">
            {getInitial(session?.user?.name || "User")}
          </div>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="flex flex-col items-center text-center px-4 pb-4 border-b border-slate-50 mb-2">
              <div className="w-12 h-12 bg-green-100 text-green-700 font-black rounded-2xl border-2 border-white flex items-center justify-center text-lg mb-3 uppercase">
                {getInitial(session?.user?.name || "User")}
              </div>
              <p className="text-sm font-black text-slate-800 truncate w-full">{session?.user?.name}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate w-full">{session?.user?.email}</p>
            </div>
            <div className="px-2">
              {/* Perubahan Utama: Redirect ke landing page / setelah logout */}
              <button 
                onClick={() => signOut({ callbackUrl: '/' })} 
                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] group"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}