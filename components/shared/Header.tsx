'use client'
import { useState, useRef, useEffect } from 'react'
import { LogOut, User } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function Header() {
  const { data: session } = useSession()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

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
  const avatarUrl = session?.user?.image
  const displayName = session?.user?.name || 'User'

  return (
    <header className="h-20 min-h-[80px] w-full shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 flex items-center justify-between px-10">
      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">
        {pathname.split('/').pop()?.replace('-', ' ')}
      </h2>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2.5 p-1 rounded-xl transition-all ${
            isDropdownOpen ? "bg-white shadow-sm ring-1 ring-slate-100" : "bg-slate-50/50 border border-slate-100 hover:bg-white"
          }`}
        >
          {/* Avatar kecil di tombol header */}
          <div className="w-8 h-8 rounded-lg border border-white shadow-sm overflow-hidden bg-green-100 flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <span className="text-xs font-bold text-green-700 uppercase">
                {getInitial(displayName)}
              </span>
            )}
          </div>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            {/* User info */}
            <div className="flex flex-col items-center text-center px-4 pb-4 border-b border-slate-50 mb-2">
              {/* Avatar besar di dropdown */}
              <div className="w-14 h-14 rounded-2xl border-2 border-white shadow-md overflow-hidden bg-green-100 flex items-center justify-center mb-3 shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <span className="text-lg font-black text-green-700 uppercase">
                    {getInitial(displayName)}
                  </span>
                )}
              </div>
              <p className="text-sm font-black text-slate-800 truncate w-full">{displayName}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate w-full">{session?.user?.email}</p>
            </div>

            <div className="px-2 space-y-0.5">
              {/* Link ke profil */}
              <Link
                href="/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-bold text-[11px]"
              >
                <User size={14} /> Lihat Profil
              </Link>

              {/* Logout */}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px]"
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
