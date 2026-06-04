'use client'

import { useState, useRef } from 'react'
import { UploadCloud, RefreshCcw, CheckCircle2, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Detection = {
  item_name: string
  freshness_status: string
  confidence: number
  icon: string
  bbox: [number, number, number, number]
}

type ScanResult = {
  status: string
  session_id: string
  image_url: string
  annotated_b64: string
  annotated_url: string
  item_count: number
  detections: Detection[]
  has_rotten: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshnessBadge(status: string) {
  if (status === 'Segar') return 'bg-green-100 text-green-700 border-green-200'
  if (status === 'Busuk') return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function confColor(conf: number) {
  if (conf >= 75) return 'text-green-600'
  if (conf >= 50) return 'text-amber-500'
  return 'text-red-500'
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [file, setFile]             = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [result, setResult]         = useState<ScanResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [zoomAnnotated, setZoomAnnotated] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  // ── File handlers ─────────────────────────────────────────────────────
  const processFile = (f: File) => {
    if (!f.type.startsWith('image/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const resetData = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Analisis ──────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source', 'Manual-Scan')
      formData.append('annotated', 'true')   // ← minta annotated image

      const res = await fetch('/api/ai/predict', { method: 'POST', body: formData })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Server error ${res.status}`)
      }

      const data: ScanResult = await res.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Koneksi ke server AI gagal')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-10 pb-16">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-10 items-center pt-4">
          <div>
            <h2 className="text-6xl font-black leading-[1.1] mb-5 tracking-tighter text-slate-900">
              Pindai bahan <br />
              <span className="text-green-600">makananmu</span> sekarang.
            </h2>
            <p className="text-lg font-bold text-slate-400 leading-relaxed">
              Unggah foto untuk melihat tingkat kesegaran bahan secara langsung
              menggunakan teknologi AI Vision kami.
            </p>
          </div>

          {/* Upload box */}
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !preview && fileInputRef.current?.click()}
              className={`relative h-[340px] rounded-[3rem] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden shadow-sm group cursor-pointer
                ${isDragging ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}
                ${preview ? 'border-none ring-4 ring-white shadow-xl cursor-default' : ''}`}
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover animate-in fade-in zoom-in duration-500"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); resetData() }}
                    className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-red-50 hover:text-red-500 transition-colors text-slate-500"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                    {file?.name}
                  </div>
                </>
              ) : (
                <div className="text-center p-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-green-50 transition-all duration-300">
                    <UploadCloud size={32} className="text-slate-400 group-hover:text-green-500 transition-colors" />
                  </div>
                  <p className="font-black text-xl text-slate-800 tracking-tight">Tarik gambar ke sini</p>
                  <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Atau klik untuk memilih file</p>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }} className="hidden" />

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={runAnalysis}
                disabled={!file || loading}
                className="flex-[2] py-5 bg-slate-900 hover:bg-green-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all disabled:bg-slate-100 disabled:text-slate-300 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading
                  ? <><RefreshCcw className="animate-spin" size={18} /> Menganalisis...</>
                  : 'Mulai Analisis'}
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

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Hasil Deteksi ────────────────────────────────────────────── */}
        {result && (
          <div className="animate-in slide-in-from-bottom duration-500 space-y-8">

            {/* Summary banner */}
            <div className={`flex items-center gap-3 p-5 rounded-3xl border font-black text-sm
              ${result.has_rotten
                ? 'bg-red-50 border-red-100 text-red-600'
                : 'bg-green-50 border-green-100 text-green-700'}`}
            >
              {result.has_rotten
                ? <><AlertCircle size={20} /> Terdeteksi bahan busuk! Segera pisahkan dari stok segar.</>
                : <><CheckCircle2 size={20} /> Semua bahan dalam kondisi segar.</>}
              <span className="ml-auto text-[11px] font-bold opacity-60 uppercase tracking-widest">
                {result.item_count} objek
              </span>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">

              {/* Annotated image */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Hasil Deteksi YOLO
                  </p>
                  <button
                    onClick={() => setZoomAnnotated(v => !v)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                  >
                    {zoomAnnotated ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                    {zoomAnnotated ? 'Kecilkan' : 'Perbesar'}
                  </button>
                </div>
                <div className={`rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-lg transition-all duration-500 ${zoomAnnotated ? 'ring-4 ring-green-500/20' : ''}`}>
                  <img
                    src={result.annotated_b64}
                    alt="Hasil deteksi YOLO dengan bounding box"
                    className={`w-full object-cover transition-all duration-500 ${zoomAnnotated ? 'scale-100' : ''}`}
                    style={{ maxHeight: zoomAnnotated ? '700px' : '420px', objectFit: 'cover' }}
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                  🟩 Hijau = Segar &nbsp;·&nbsp; 🟦 Biru = Busuk
                </p>
              </div>

              {/* Detection list */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Detail per Objek
                </p>

                {result.detections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-3">
                    <span className="text-5xl">🔍</span>
                    <p className="text-xs font-bold uppercase tracking-widest">Tidak ada objek terdeteksi</p>
                    <p className="text-[10px] text-slate-300 text-center max-w-xs">
                      Coba foto dengan pencahayaan lebih baik atau objek lebih dekat ke kamera.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {result.detections.map((det, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                      >
                        {/* Nomor urut */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 flex-shrink-0">
                          {i + 1}
                        </div>

                        {/* Ikon */}
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 flex-shrink-0">
                          {det.icon}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 leading-none">{det.item_name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${freshnessBadge(det.freshness_status)}`}>
                              {det.freshness_status}
                            </span>
                          </div>
                        </div>

                        {/* Confidence */}
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xl font-black leading-none ${confColor(det.confidence)}`}>
                            {det.confidence}%
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">conf</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center pt-2">
                  Hasil otomatis tersimpan ke Inventori & Riwayat Scan
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
