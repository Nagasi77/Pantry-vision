export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex selection:bg-green-500/30 overflow-hidden">
      {/* SEKSI KIRI - FORM (DIRENDER DARI PAGE.TSX) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 z-10">
        {children}
      </div>

      {/* SEKSI KANAN - VISUAL INFO (KONSISTEN) */}
      <div className="hidden md:flex w-1/2 bg-slate-50 items-center justify-center relative overflow-hidden">
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-100 rounded-full blur-[120px] opacity-60"></div>
        <div className="relative z-10 text-center px-12">
          <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] mb-10 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-all duration-500 mx-auto">
            <div className="w-8 h-8 bg-green-500 rounded-lg animate-pulse"></div>
          </div>
          <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-[0.9]">
            Pantry<br/><span className="text-green-600">Vision.</span>
          </h2>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
            Mendeteksi kesegaran bahan makanan dengan Computer Vision. Dibangun dengan metodologi PULP untuk hasil presisi.
          </p>
        </div>
      </div>
    </div>
  )
}