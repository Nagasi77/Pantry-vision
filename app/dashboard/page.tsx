'use client'
import { useState, useEffect } from 'react'

export default function DashboardPage() {
  const [sensorRealtime, setSensorRealtime] = useState({
    berat: 150,
    gas: 'Normal',
    jarak: 8
  })

  useEffect(() => {
    const ambilDataIoT = async () => {
    }
    ambilDataIoT()
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <a href="/" className="flex items-center gap-2">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="font-bold text-lg">Pantry Vision</h1>
        </div>
        </a>
        
        <nav className="flex-1 py-6">
          <p className="px-6 text-xs font-bold text-green-600 mb-2">Utama</p>
          <a href="#" className="flex items-center px-6 py-3 bg-gray-100 border-l-4 border-green-600 text-green-700 font-bold">
            <span className="mr-3">Dashboard</span>
          </a>
          <a href="/inventory" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">
            <span className="mr-3">Inventori</span> 
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">
            <span className="mr-3">Sensor</span> 
          </a>
          <a href="/scan" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">
            <span className="mr-3">Scan</span> 
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">
            <span className="mr-3">Riwayat Scan</span> 
          </a>
          
          <p className="px-6 text-xs font-bold text-gray-400 mb-2 mt-8">Akun</p>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">
            <span className="mr-3">Profile</span> 
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">
            <span className="mr-3">LogOut</span> 
          </a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-medium">Dashboard</h2>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">👤</div>
        </header>

        <div className="p-8 space-y-6">
          
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Total bahan</p>
              <p className="text-4xl font-bold">10</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Stok aman</p>
              <p className="text-4xl font-bold">9</p>
              <p className="text-xs text-gray-400 mt-1">dari 10 item</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Perlu restok</p>
              <p className="text-4xl font-bold">1</p>
              <p className="text-xs text-gray-400 mt-1">pisang</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Scan hari ini</p>
              <p className="text-4xl font-bold">5</p>
              <p className="text-xs text-gray-400 mt-1">total scan</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            
            <div className="col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-medium mb-6">Inventori dapur</h3>
              <div className="space-y-4">
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-xl">🍎</div>
                    <div>
                      <p className="font-medium leading-none mb-1">Apel</p>
                      <p className="text-xs text-gray-500">150 g. 52 kkal</p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-[150px] mx-8">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-full"></div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gray-200 rounded-lg text-xs font-bold">5 pcs</div>
                </div>


                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-xl">🍌</div>
                    <div>
                      <p className="font-medium leading-none mb-1">Pisang</p>
                      <p className="text-xs text-gray-500">120 g. 89 kkal</p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-[150px] mx-8">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 w-2/5"></div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gray-200 rounded-lg text-xs font-bold">2 pcs</div>
                </div>

              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h3 className="font-medium mb-6">Sensor real-time</h3>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Berat</p>
                  <p className="font-medium">{sensorRealtime.berat} g</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Gas</p>
                  <p className="font-medium">{sensorRealtime.gas}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Jarak</p>
                  <p className="font-medium">{sensorRealtime.jarak} cm</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl shrink-0">🍎</div>
                  <div>
                    <p className="font-bold text-sm mb-1">Apel - 150 g</p>
                    <p className="text-xs text-gray-600 mb-2">52 kkal, C:13.8g, P:0.3g, L:0.2g</p>
                    <p className="text-[10px] text-gray-500 leading-tight">Saran menu: Pie apel, Salad buah</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}