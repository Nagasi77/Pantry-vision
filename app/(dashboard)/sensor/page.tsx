"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Scan, RefreshCw } from "lucide-react";
import mqtt from "mqtt";

type FreshnessStatus = "fresh" | "medium" | "low";

interface ScanEntry {
  emoji: string;
  name: string;
  time: string;
  pct: number;
  status: FreshnessStatus;
}

const STATUS_LABEL: Record<FreshnessStatus, string> = {
  fresh: "Segar",
  medium: "Cukup Segar",
  low: "Kurang Segar",
};

const STATUS_BG: Record<FreshnessStatus, string> = {
  fresh: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

function freshnessColor(pct: number) {
  if (pct >= 70) return "#16a34a";
  if (pct >= 45) return "#d97706";
  return "#dc2626";
}

function nowTime() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function Badge({ status, small }: { status: FreshnessStatus; small?: boolean }) {
  return (
    <span className={`inline-block rounded-full font-black uppercase ${small ? "px-2 py-0.5 text-[8px]" : "px-3 py-1 text-[10px]"} ${STATUS_BG[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function Gauge({ value, labelText }: { value: number; labelText: string }) {
  const color = freshnessColor(value);
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
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black tracking-tighter" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center mt-3 text-center">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Kondisi Objek</span>
        <span className="text-xs font-black uppercase tracking-widest mt-1" style={{ color }}>{labelText}</span>
      </div>
    </div>
  );
}

export default function SensorPage() {
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [jarak, setJarak] = useState(0);
  const [gasFromSensor, setGasFromSensor] = useState("Menunggu alat...");
  
  // Data visual yang diperbarui otomatis oleh sistem IoT
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [displayFreshness, setDisplayFreshness] = useState(0);
  const [displayLabel, setDisplayLabel] = useState("Belum Ada Objek");
  const [saranPenggunaan, setSaranPenggunaan] = useState("Tempatkan buah apel di dalam jangkauan sensor.");

  // Ref untuk menyimpan instance client MQTT agar bisa diakses di luar useEffect
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);

  useEffect(() => {
    const client = mqtt.connect("ws://broker.hivemq.com:8000/mqtt");
    mqttClientRef.current = client;

    client.on("connect", () => {
      console.log("MQTT Terhubung");
      client.subscribe("pantry/sensors");
      client.subscribe("pantry/status"); // Mendengarkan status foto dari ESP32
    });

    client.on("message", (topic, message) => {
      try {
        const payload = message.toString();
        
        if (topic === "pantry/sensors") {
          const data = JSON.parse(payload);
          if (data.jarak !== undefined) setJarak(data.jarak);
          if (data.gas !== undefined) setGasFromSensor(data.gas);
          
          // Jika backend AI mengirimkan hasil prediksi langsung via MQTT
          if (data.label !== undefined) {
            setDisplayLabel(data.label);
            setDisplayFreshness(data.confidence || 0);
            if (data.saran) setSaranPenggunaan(data.saran);
            
            // Masukkan data otomatis ke riwayat
            setHistory((prev) => [
              {
                emoji: "🍎",
                name: `Apel (${data.label})`,
                time: nowTime(),
                pct: data.confidence || 0,
                status: data.confidence >= 70 ? "fresh" : data.confidence >= 45 ? "medium" : "low"
              },
              ...prev.slice(0, 4),
            ]);
          }
        }
      } catch (e) {
        console.log("Error parse data");
      }
    });

    return () => { if (client) client.end(); };
  }, []);

  // Ambil data analisis terbaru dari database/backend FastAPI
  const fetchLatestIoTData = useCallback(async () => {
    setIsScanning(true);
    try {
      const res = await fetch("http://localhost:8000/predict/iot-latest");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      
      setScannedImage(data.image_url);
      setDisplayFreshness(data.confidence);
      setDisplayLabel(data.label);
      setSaranPenggunaan(data.saran);
    } catch (err) {
      console.error("Gagal sinkronisasi data:", err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // FUNGSI REMOTE TRIGGER: Menyuruh ESP32 mengambil foto lewat MQTT
  const triggerRemoteHardwareScan = useCallback(() => {
    if (!mqttClientRef.current) {
      alert("Koneksi MQTT belum siap.");
      return;
    }
    
    setIsScanning(true);
    // Kirim perintah jepret ke topik pantry/perintah yang sudah di-subscribe oleh ESP32 kamu
    mqttClientRef.current.publish("pantry/perintah", "AMBIL_FOTO");
    
    // Beri jeda 3 detik agar hardware memproses foto dan mengirimkannya ke FastAPI
    setTimeout(() => {
      fetchLatestIoTData();
    }, 3000);
  }, [fetchLatestIoTData]);

  return (
    <div className="w-full space-y-8 pb-16">
      {/* SENSOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Berat</p>
          <p className="text-3xl font-black tracking-tighter text-slate-800 leading-none">0g</p>
          <p className="text-[10px] font-bold text-red-400 uppercase italic mt-2">Sensor Offline</p>
        </div>
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Gas / Aroma</p>
          <span className={`text-3xl font-black tracking-tighter block leading-none ${gasFromSensor === "Normal" ? "text-green-600" : "text-orange-500"}`}>
            {gasFromSensor}
          </span>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">Data Real-time MQTT</p>
        </div>
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Jarak Scan</p>
          <p className="text-3xl font-black tracking-tighter text-slate-800 leading-none">{jarak}cm</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">Optimal: 5-10 cm</p>
        </div>
      </div>

      {/* GAUGE PANEL & PANEL GAMBAR IOT */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/5 blur-[120px] pointer-events-none" />
        
        <div className="flex flex-col items-center justify-center gap-6">
          <Gauge value={displayFreshness} labelText={displayLabel} />
          
          {scannedImage ? (
            <div className="mt-2 w-40 h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-50 p-1 flex flex-col items-center justify-center">
              <img src={scannedImage} alt="Kamera ESP32-CAM" className="w-full h-full object-cover rounded-xl" />
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Live Image IoT</p>
            </div>
          ) : (
            <div className="mt-2 w-40 h-40 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center p-4 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Belum ada tangkapan foto dari alat</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-2 leading-none">
              🍎 Komoditas: Apel
            </h3>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest">52 Kkal / 100g</span>
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-[9px] font-black uppercase tracking-widest">Infrastruktur IoT Aktif</span>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saran Penggunaan</p>
            <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{saranPenggunaan}"</p>
          </div>
        </div>
      </div>

      {/* RIWAYAT & AKSI TOMBOL */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-slate-800 tracking-tighter uppercase">Kontrol Perangkat IoT</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchLatestIoTData}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-all"
            >
              <RefreshCw size={12} className={isScanning ? "animate-spin" : ""} />
              Sync Data
            </button>
            <button
              onClick={triggerRemoteHardwareScan}
              disabled={isScanning}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-100 active:scale-95"
            >
              {isScanning ? "Memproses Hardware..." : "Jepret Kamera Alat"}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm p-8 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Riwayat Deteksi Kotak Pantry</p>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada riwayat deteksi objek otomatis.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {history.map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-4 hover:bg-slate-50/50 transition-colors rounded-2xl px-2">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold text-slate-400 italic w-12">{entry.time}</span>
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-sm border border-white">{entry.emoji}</div>
                    <span className="text-sm font-black text-slate-800 tracking-tight">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-sm font-black block leading-none" style={{ color: freshnessColor(entry.pct) }}>{entry.pct}%</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase">Confidence</span>
                    </div>
                    <Badge status={entry.status} small />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}