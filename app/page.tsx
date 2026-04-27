export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center p-8 text-center">
      
      {/* Background*/}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Background*/}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px] opacity-50 z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-50 z-0"></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-gray-900 rounded-[2rem] mb-10 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
          <div className="w-8 h-8 bg-blue-500 rounded-lg animate-pulse"></div>
        </div>

        <h1 className="text-7xl font-black text-gray-900 mb-6 tracking-tighter">
          Pantry<span className="text-blue-600">Vision.</span>
        </h1>
        
        <p className="text-xl text-gray-500 max-w-xl mb-12 leading-relaxed font-medium">
          Mendeteksi kesegaran buah dengan Computer Vision. Dibangun dengan metodologi <span className="text-gray-900 font-bold underline decoration-blue-500">P U L P</span> untuk hasil prediksi yang presisi.
        </p>

        <div className="flex gap-4">
          <a 
            href="/auth/login" 
            className="px-10 py-5 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-2xl hover:scale-105 text-lg"
          >
            Mulai Pemindaian
          </a>
          <a 
            href="https://github.com/Nagasi77/Pantry-vision.git" 
            className="px-10 py-5 bg-white text-gray-900 border border-gray-200 font-bold rounded-2xl hover:bg-gray-50 transition-all text-lg"
          >
            Lihat Dokumentasi
          </a>
        </div>

        <div className="mt-24 grid grid-cols-3 gap-12 border-t border-gray-100 pt-12">
          <div className="text-left">
            <p className="text-2xl font-black text-gray-900">98%</p>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Akurasi Model</p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-gray-900">0.5s</p>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Inference Time</p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black text-gray-900">2026</p>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Tech Stack Latest</p>
          </div>
        </div>
      </div>
    </div>
  )
}