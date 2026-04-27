'use client'

import { useState } from 'react'
import { UploadCloud, RefreshCcw } from 'lucide-react'

export default function ScanPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<{label: string, confidence: number} | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // ── LOGIC HANDLERS ──
  const processFile = (selectedFile: File) => {
    if (selectedFile.type.startsWith('image/')) {
      setFile(selectedFile)
      setPreview(URL.createObjectURL(selectedFile))
      setResult(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) processFile(droppedFile)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="p-4 lg:p-10">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center py-8">
        {/* TEXT SECTION */}
        <div className="text-left">
          <h2 className="text-6xl font-black leading-[1.1] mb-6 tracking-tighter text-slate-900">
            Pindai bahan <br/> <span className="text-green-600">makananmu</span> sekarang.
          </h2>
          <p className="text-lg font-bold text-slate-400 mb-8 leading-relaxed">
            Unggah foto untuk melihat tingkat kesegaran bahan secara langsung menggunakan teknologi AI Vision kami.
          </p>
        </div>

        {/* UPLOAD & RESULT SECTION */}
        <div className="space-y-6">
          {/* UPLOAD BOX */}
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

          {/* RESULT AREA */}
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
  )
}