"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw,
  Camera,
  CheckCircle2,
  AlertCircle,
  Scan,
  ZoomIn,
  ZoomOut,
  Clock,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
// mqtt is imported dynamically to avoid Node.js built-in module errors on Vercel
import type mqtt from "mqtt";
type MqttClient = mqtt.MqttClient;

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
  annotated_b64?: string;
  annotated_url?: string;
  item_count: number;
  detections: DetectionResult[];
  has_rotten: boolean;
  scanned_at?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshnessBadge(status: string) {
  if (status === "Segar") return "bg-green-100 text-green-700 border-green-200";
  if (status === "Busuk") return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function confColor(conf: number) {
  if (conf >= 75) return "text-green-600";
  if (conf >= 50) return "text-amber-500";
  return "text-red-500";
}

function formatTime(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Gauge ─────────────────────────────────────────────────────────────────────

function Gauge({ value, label }: { value: number; label: string }) {
  const color =
    value >= 70 ? "#16a34a" : value >= 45 ? "#d97706" : "#dc2626";
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-[100px] h-[100px] flex-shrink-0">
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none">
          Rata-rata Kepercayaan
        </p>
        <p className="text-base font-black mt-1 leading-none" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

// ── Image Viewer ──────────────────────────────────────────────────────────────

function ImageCard({
  src,
  label,
  badge,
  empty,
  zoom,
  onToggleZoom,
}: {
  src?: string | null;
  label: string;
  badge?: React.ReactNode;
  empty?: React.ReactNode;
  zoom: boolean;
  onToggleZoom: () => void;
}) {
  return (
    <div className="space-y-2">
      {/* label bar */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </p>
        {src && (
          <button
            onClick={onToggleZoom}
            className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors"
          >
            {zoom ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
            {zoom ? "Kecilkan" : "Perbesar"}
          </button>
        )}
      </div>

      {/* image box */}
      <div
        className={`relative rounded-[2rem] overflow-hidden border border-slate-100 shadow-md bg-slate-50 transition-all duration-500
          ${zoom ? "ring-4 ring-green-400/30" : ""}`}
        style={{ height: zoom ? "480px" : "280px" }}
      >
        {src ? (
          <img
            src={src}
            alt={label}
            className="w-full h-full object-contain transition-all duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
            {empty}
          </div>
        )}

        {/* overlay badge */}
        {badge && src && (
          <div className="absolute bottom-3 left-3">{badge}</div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SensorPage() {
  // Sensor realtime (MQTT)
  const [jarak, setJarak] = useState(0);
  const [gasFromSensor, setGasFromSensor] = useState("Menunggu alat...");
  const mqttClientRef = useRef<MqttClient | null>(null);

  // Hasil scan
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Zoom states
  const [zoomRaw, setZoomRaw] = useState(false);
  const [zoomAnnotated, setZoomAnnotated] = useState(false);

  // Derived
  const avgConf = scanResult?.detections.length
    ? Math.round(
        scanResult.detections.reduce((s, d) => s + d.confidence, 0) /
          scanResult.detections.length
      )
    : 0;

  const gaugeLabel = !scanResult
    ? "Belum Ada Data"
    : scanResult.has_rotten
    ? "Ada Bahan Busuk"
    : "Semua Segar";

  // ── MQTT ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let client: MqttClient;

    import("mqtt").then((mqttModule) => {
      client = mqttModule.default.connect("wss://broker.hivemq.com:8884/mqtt");
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
    });

    return () => {
      client?.end();
    };
  }, []);

  // ── Fetch latest scan dari DB ─────────────────────────────────────────
  const fetchLatestScan = useCallback(async () => {
    if (isPaused) return; // skip jika kamera dijeda
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
          // annotated_url disimpan sebagai image_url di scan-annotated endpoint
          annotated_url: data.session.annotated_url || data.session.image_url || "",
          item_count: data.session.item_count,
          scanned_at: data.session.scanned_at,
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
  }, [isPaused]);

  // ── Trigger ESP32-CAM via MQTT ────────────────────────────────────────
  const triggerHardwareScan = useCallback(() => {
    setIsPaused(false); // resume otomatis saat jepret
    mqttClientRef.current?.publish("pantry/perintah", "AMBIL_FOTO");
    setTimeout(fetchLatestScan, 10000);
  }, [fetchLatestScan]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-16">

      {/* ── Sensor Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Gas / Aroma
          </p>
          <span
            className={`text-3xl font-black tracking-tighter block leading-none ${
              gasFromSensor === "Normal" ? "text-green-600" : "text-orange-500"
            }`}
          >
            {gasFromSensor}
          </span>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">
            Data Real-time MQTT
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            Jarak Scan
          </p>
          <p className="text-3xl font-black tracking-tighter text-slate-800 leading-none">
            {jarak} cm
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">
            Optimal: 5–10 cm
          </p>
        </div>
      </div>

      {/* ── Live Vision Panel ─────────────────────────────────────── */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-50 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <Scan size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tight text-base">
                Live Vision
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Gambar asli &amp; hasil anotasi AI dari scan terakhir
              </p>
            </div>
          </div>

          {/* Paused indicator */}
          {isPaused && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest">
              <PauseCircle size={13} />
              Kamera dijeda — tekan Jepret untuk lanjut
            </div>
          )}

          {/* Gauge summary */}
          {scanResult && (
            <Gauge value={avgConf} label={gaugeLabel} />
          )}
        </div>

        {/* Image grid */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gambar asli */}
          <ImageCard
            src={scanResult?.image_url}
            label="Gambar Asli"
            zoom={zoomRaw}
            onToggleZoom={() => setZoomRaw((v) => !v)}
            badge={
              scanResult?.scanned_at ? (
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                  <Clock size={10} />
                  {formatTime(scanResult.scanned_at)}
                </div>
              ) : null
            }
            empty={
              <>
                <Camera size={36} strokeWidth={1} />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Menunggu gambar dari alat
                </p>
              </>
            }
          />

          {/* Gambar anotasi */}
          <ImageCard
            src={scanResult?.annotated_b64 || scanResult?.annotated_url}
            label="Hasil Anotasi YOLO"
            zoom={zoomAnnotated}
            onToggleZoom={() => setZoomAnnotated((v) => !v)}
            badge={
              scanResult ? (
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md
                    ${scanResult.has_rotten
                      ? "bg-red-500/80 text-white"
                      : "bg-green-600/80 text-white"
                    }`}
                >
                  {scanResult.has_rotten
                    ? <><AlertCircle size={10} /> Ada Busuk</>
                    : <><CheckCircle2 size={10} /> Semua Segar</>
                  }
                </div>
              ) : null
            }
            empty={
              <>
                <Scan size={36} strokeWidth={1} />
                <p className="text-xs font-bold uppercase tracking-widest">
                  Anotasi belum tersedia
                </p>
              </>
            }
          />
        </div>

        {/* Legend */}
        <div className="px-8 pb-3 -mt-2">
          <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
            🟩 Hijau = Segar &nbsp;·&nbsp; 🟦 Biru = Busuk
          </p>
        </div>

        {/* Detection list */}
        <div className="px-8 pb-8">
          {/* Error */}
          {scanError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold mb-5">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {scanError}
            </div>
          )}

          {scanResult ? (
            <div className="space-y-4">
              {/* Summary banner */}
              <div
                className={`flex items-center gap-3 p-4 rounded-2xl border font-black text-sm
                  ${scanResult.item_count === 0
                    ? "bg-slate-50 border-slate-200 text-slate-500"
                    : scanResult.has_rotten
                    ? "bg-red-50 border-red-100 text-red-600"
                    : "bg-green-50 border-green-100 text-green-700"
                  }`}
              >
                {scanResult.item_count === 0 ? (
                  <><AlertCircle size={18} /> Tidak ada objek terdeteksi pada scan ini.</>
                ) : scanResult.has_rotten ? (
                  <><AlertCircle size={18} /> Terdeteksi bahan busuk! Segera pisahkan dari stok segar.</>
                ) : (
                  <><CheckCircle2 size={18} /> Semua bahan dalam kondisi segar.</>
                )}
                <span className="ml-auto text-[11px] font-bold opacity-60 uppercase tracking-widest">
                  {scanResult.item_count} objek
                </span>
              </div>

              {/* Object cards */}
              {scanResult.detections.length > 0 && (
                <>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Detail per Objek
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {scanResult.detections.map((det, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all"
                      >
                        {/* Number */}
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-400 flex-shrink-0 shadow-sm">
                          {i + 1}
                        </div>

                        {/* Icon */}
                        <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-xl border border-slate-100 flex-shrink-0">
                          {det.icon || "📦"}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 text-sm leading-none truncate">
                            {det.item_name}
                          </p>
                          <span
                            className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full border uppercase mt-1.5 ${freshnessBadge(
                              det.freshness_status
                            )}`}
                          >
                            {det.freshness_status}
                          </span>
                        </div>

                        {/* Confidence */}
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-black leading-none ${confColor(det.confidence)}`}>
                            {det.confidence}%
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">conf</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center pt-2">
                Hasil tersimpan ke riwayat &amp; inventori diperbarui otomatis
              </p>
            </div>
          ) : (
            /* Placeholder */
            <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-3">
              <Camera size={44} strokeWidth={1} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 text-center">
                Belum ada data scan — tekan "Jepret Kamera Alat" atau "Sync Data"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Kontrol Hardware IoT ───────────────────────────────────── */}
      <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 blur-[90px] pointer-events-none" />
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
              onClick={() => setIsPaused((v) => !v)}
              disabled={isScanning}
              title={isPaused ? "Kamera sedang dijeda — tekan Jepret untuk lanjut" : "Jeda tangkapan kamera"}
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all disabled:opacity-40 ${
                isPaused
                  ? "bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-900/30"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isPaused ? (
                <><PlayCircle size={13} /> Dijeda</>
              ) : (
                <><PauseCircle size={13} /> Pause</>
              )}
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