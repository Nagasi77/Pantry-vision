"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Upload, X, FlaskConical, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import mqtt from "mqtt";

// ── Types ─────────────────────────────────────────────────────────────────────

type DetectionResult = {
  item_name: string;
  freshness_status: string;
  confidence: number;
  icon: string;
};

type ScanResult = {
  session_id: string;
  image_url: string;
  item_count: number;
  detections: DetectionResult[];
  has_rotten: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshnessColor(status: string) {
  if (status === "Segar") return "text-green-600";
  if (status === "Busuk") return "text-red-500";
  return "text-slate-500";
}

function freshnessBadge(status: string) {
  if (status === "Segar") return "bg-green-100 text-green-700 border-green-200";
  if (status === "Busuk") return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function nowTime() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// ── Gauge ─────────────────────────────────────────────────────────────────────

function Gauge({ value, labelText }: { value: number; labelText: string }) {
  const color = value >= 70 ? "#16a34a" : value >= 45 ? "#d97706" : "#dc2626";
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
          <circle cx="72" cy="72" r="54" fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <circle
            cx="72" cy="72" r="54" fill="none"
            stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black tracking-tighter" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center mt-3 text-center">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Rata-rata Kesegaran</span>
        <span className="text-xs font-black uppercase tracking-widest mt-1" style={{ color }}>{labelText}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SensorPage() {
  // Sensor realtime (MQTT)
  const [jarak, setJarak] = useState(0);
  const [gasFromSensor, setGasFromSensor] = useState("Menunggu alat...");
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);

  // Hasil scan terbaru
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Upload testing
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gauge summary dari scan terakhir
  const avgConfidence = scanResult
    ? Math.round(
        scanResult.detections.reduce((acc, d) => acc + d.confidence, 0) /
          Math.max(scanResult.detections.length, 1)
      )
    : 0;
  const gaugeLabel = scanResult
    ? scanResult.has_rotten
      ? "Ada Busuk"
      : "Semua Segar"
    : "Belum Ada Data";

  // ── MQTT ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const client = mqtt.connect("ws://broker.hivemq.com:8000/mqtt");
    mqttClientRef.current = client;
    client.on("connect", () => {
      client.subscribe("pantry/sensors");
    });
    client.on("message", (topic, message) => {
      try {
        if (topic === "pantry/sensors") {
          const data = JSON.parse(message.toString());
          if (data.jarak !== undefined) setJarak(data.jarak);
          if (data.gas !== undefined) setGasFromSensor(data.gas);
        }
      } catch (_) {}
    });
    return () => { client.end(); };
  }, []);

  // ── Sync data terbaru dari DB ────────────────────────────────────────────
  const fetchLatestScan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await fetch("/api/ai/iot-latest");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.session) {
        setScanResult({
          session_id: data.session.id,
          image_url: data.session.image_url || "",
          item_count: data.session.item_count,
          detections: (data.detections || []).map((d: any) => ({
            item_name: d.item_name,
            freshness_status: d.freshness_status,
            confidence: Math.round(d.confidence * 100),
            icon: d.icon,
          })),
          has_rotten: (data.detections || []).some(
            (d: any) => d.freshness_status === "Busuk"
          ),
        });
      }
    } catch (err: any) {
      setScanError("Gagal sinkronisasi: " + err.message);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // ── Upload file preview ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTestFile(file);
    setTestPreview(URL.createObjectURL(file));
    setScanResult(null);
    setScanError(null);
  };

  const clearFile = () => {
    setTestFile(null);
    setTestPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Kirim foto ke backend YOLO ───────────────────────────────────────────
  const runTestScan = useCallback(async () => {
    if (!testFile) return;
    setIsScanning(true);
    setScanError(null);
    try {
      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("source", "Manual-Test");

      const res = await fetch("/api/ai/predict", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Bangun ScanResult dari response FastAPI /predict/scan
      setScanResult({
        session_id: data.session_id || "test",
        image_url: testPreview || "",
        item_count: data.item_count || 0,
        detections: (data.detections || []).map((d: any) => ({
          item_name: d.item_name,
          freshness_status: d.freshness_status,
          confidence: d.confidence,
          icon: d.icon,
        })),
        has_rotten: data.has_rotten || false,
      });
    } catch (err: any) {
      setScanError(err.message || "Scan gagal");
    } finally {
      setIsScanning(false);
    }
  }, [testFile, testPreview]);

  // ── Trigger MQTT jepret kamera ESP32 ─────────────────────────────────────
  const triggerHardwareScan = useCallback(() => {
    mqttClientRef.current?.publish("pantry/perintah", "AMBIL_FOTO");
    setTimeout(fetchLatestScan, 3500);
  }, [fetchLatestScan]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setTestFile(file);
      setTestPreview(URL.createObjectURL(file));
      setScanResult(null);
      setScanError(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">

      {/* ── Sensor Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Gas / Aroma</p>
          <span className={`text-3xl font-black tracking-tighter block leading-none ${gasFromSensor === "Normal" ? "text-green-600" : "text-orange-500"}`}>
            {gasFromSensor}
          </span>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">Data Real-time MQTT</p>
        </div>
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Jarak Scan</p>
          <p className="text-3xl font-black tracking-tighter text-slate-800 leading-none">{jarak} cm</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">Optimal: 5–10 cm</p>
        </div>
      </div>

      {/* ── Upload Testing Panel ───────────────────────────────────────── */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center gap-3 border-b border-slate-50">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <FlaskConical size={18} className="text-amber-500" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 tracking-tight">Mode Testing</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Upload foto untuk uji model YOLO tanpa hardware
            </p>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Kiri: Upload area */}
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !testPreview && fileInputRef.current?.click()}
              className={`relative rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                ${testPreview
                  ? "border-green-200 bg-green-50/30 cursor-default"
                  : "border-slate-200 bg-slate-50 hover:border-green-400 hover:bg-green-50/20"
                }`}
            >
              {testPreview ? (
                <div className="relative">
                  <img
                    src={testPreview}
                    alt="Preview foto test"
                    className="w-full max-h-72 object-cover rounded-3xl"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                    {testFile?.name}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Upload size={24} className="text-slate-400" />
                  </div>
                  <p className="font-black text-slate-600 text-sm mb-1">Drag & drop foto di sini</p>
                  <p className="text-xs text-slate-400 font-medium mb-4">atau klik untuk pilih file</p>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    JPG, PNG, WEBP · Maks 10 MB
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Tombol aksi */}
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                <Camera size={14} />
                {testPreview ? "Ganti Foto" : "Pilih Foto"}
              </button>
              <button
                onClick={runTestScan}
                disabled={!testFile || isScanning}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-100 active:scale-95"
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <FlaskConical size={14} />
                    Jalankan Test
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {scanError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                {scanError}
              </div>
            )}
          </div>

          {/* Kanan: Hasil deteksi */}
          <div className="space-y-5">
            {/* Gauge */}
            <div className="flex justify-center">
              <Gauge value={avgConfidence} labelText={gaugeLabel} />
            </div>

            {/* Daftar deteksi */}
            {scanResult && (
              <div className="space-y-3">
                {/* Summary badge */}
                <div className={`flex items-center gap-2 p-4 rounded-2xl border text-sm font-black
                  ${scanResult.has_rotten
                    ? "bg-red-50 border-red-100 text-red-600"
                    : "bg-green-50 border-green-100 text-green-600"
                  }`}
                >
                  {scanResult.has_rotten
                    ? <><AlertCircle size={16} /> Terdeteksi bahan busuk!</>
                    : <><CheckCircle2 size={16} /> Semua bahan dalam kondisi segar</>
                  }
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  {scanResult.item_count} objek terdeteksi
                </p>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {scanResult.detections.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">
                      Tidak ada objek yang dikenali model.
                    </p>
                  ) : (
                    scanResult.detections.map((det, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{det.icon}</span>
                          <div>
                            <p className="font-black text-slate-800 text-sm leading-none">
                              {det.item_name}
                            </p>
                            <p className={`text-[10px] font-bold uppercase mt-0.5 ${freshnessColor(det.freshness_status)}`}>
                              {det.freshness_status}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-800">{det.confidence}%</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">conf</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase ${freshnessBadge(det.freshness_status)}`}>
                            {det.freshness_status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center pt-2">
                  Hasil disimpan ke riwayat & inventori diperbarui
                </p>
              </div>
            )}

            {/* Placeholder sebelum scan */}
            {!scanResult && !isScanning && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-200 gap-3">
                <FlaskConical size={40} strokeWidth={1} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  Upload foto lalu klik Jalankan Test
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Kontrol Hardware IoT ──────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 blur-[80px]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-3 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              Kontrol Hardware IoT
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kirim perintah langsung ke ESP32-CAM via MQTT
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={fetchLatestScan}
              disabled={isScanning}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all"
            >
              <RefreshCw size={12} className={isScanning ? "animate-spin" : ""} />
              Sync Data
            </button>
            <button
              onClick={triggerHardwareScan}
              disabled={isScanning}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-900/40 active:scale-95"
            >
              <Camera size={14} />
              {isScanning ? "Memproses..." : "Jepret Kamera Alat"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
