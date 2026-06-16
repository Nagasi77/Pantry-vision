"use client";

import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  PackageCheck,
  ShieldCheck,
  Cpu,
  Home,
  LogIn,
  CreditCard,
  Headphones,
  X,
  Check,
  Mail,
  Clock,
} from "lucide-react";

type Detection = {
  item_name: string;
  freshness_status: string;
  confidence: number;
  icon?: string;
  bbox?: [number, number, number, number];
};

type ScanResult = {
  status: string | boolean;
  session_id?: string;
  image_url?: string;
  annotated_b64?: string;
  annotated_url?: string;
  item_count: number;
  detections: Detection[];
  has_rotten: boolean;
  message?: string;
};

type SectionId = "home" | "contact-support";

const API_ENDPOINT = "/api/ai/predict";

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

function getAnnotatedSrc(result: ScanResult) {
  if (result.annotated_b64) {
    if (result.annotated_b64.startsWith("data:image")) return result.annotated_b64;
    return `data:image/jpeg;base64,${result.annotated_b64}`;
  }

  if (result.annotated_url) return result.annotated_url;
  if (result.image_url) return result.image_url;

  return "";
}

export default function LandingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomAnnotated, setZoomAnnotated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("home");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToSection = (sectionId: SectionId) => {
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setActiveSection(sectionId);
    }
  };

  const navButtonClass = (sectionId: SectionId) =>
    `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-all ${
      activeSection === sectionId
        ? "bg-white text-green-700 shadow-sm"
        : "text-white hover:bg-white/15"
    }`;

  const navActionClass =
    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black text-white hover:bg-white/15 transition-all";

  const subscriptionButtonClass = `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black transition-all shadow-sm ${
    showSubscriptionModal
      ? "bg-slate-900 text-white"
      : "bg-white text-green-700 hover:bg-green-50"
  }`;

  useEffect(() => {
    const sectionIds: SectionId[] = ["home", "contact-support"];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        const visibleId = visibleEntry?.target?.id;

        if (visibleId === "home" || visibleId === "contact-support") {
          setActiveSection(visibleId);
        }
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5, 0.75],
        rootMargin: "-110px 0px -45% 0px",
      }
    );

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    const handleScrollFallback = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= documentHeight - 100) {
        setActiveSection("contact-support");
      } else if (scrollTop < 350) {
        setActiveSection("home");
      }
    };

    window.addEventListener("scroll", handleScrollFallback, { passive: true });
    handleScrollFallback();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScrollFallback);
    };
  }, []);

  const processFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const resetData = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setZoomAnnotated(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const runAnalysis = async () => {
    if (!file) {
      setError("Pilih gambar terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", "Landing-Scan");
      formData.append("annotated", "true");

      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${res.status}`);
      }

      const data: ScanResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Koneksi ke server AI gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleSupportFromModal = () => {
    setShowSubscriptionModal(false);

    setTimeout(() => {
      scrollToSection("contact-support");
    }, 100);
  };

  const annotatedSrc = result ? getAnnotatedSrc(result) : "";

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-green-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 lg:px-10 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <button
            type="button"
            onClick={() => scrollToSection("home")}
            className="flex items-center gap-3 text-left"
          >
            <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md">
              <div className="w-5 h-5 bg-green-400 rounded-md animate-pulse" />
            </div>

            <div>
              <p className="text-xl font-black tracking-tight leading-none">
                Pantry<span className="text-green-200">Vision</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-green-100">
                Smart Food Storage
              </p>
            </div>
          </button>

          <nav className="flex flex-wrap items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => scrollToSection("home")}
              className={navButtonClass("home")}
            >
              <Home size={16} />
              Home
            </button>

            <a href="/auth/login" className={navActionClass}>
              <LogIn size={16} />
              Sudah Punya Storage?
            </a>

            <button
              type="button"
              onClick={() => setShowSubscriptionModal(true)}
              className={subscriptionButtonClass}
            >
              <CreditCard size={16} />
              Subscription
            </button>

            <button
              type="button"
              onClick={() => scrollToSection("contact-support")}
              className={navButtonClass("contact-support")}
            >
              <Headphones size={16} />
              Contact Support
            </button>
          </nav>
        </div>
      </header>

      {/* Background grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Background blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-100 rounded-full blur-[120px] opacity-50 z-0 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-50 rounded-full blur-[120px] opacity-50 z-0 pointer-events-none" />

      <main className="relative z-10 px-4 py-10 lg:px-10">
        <div className="max-w-6xl mx-auto space-y-14">
          {/* Hero */}
          <section
            id="home"
            className="scroll-mt-28 grid lg:grid-cols-2 gap-10 items-center pt-6"
          >
            <div className="text-center lg:text-left">
              <div className="w-20 h-20 bg-gray-900 rounded-[2rem] mb-8 mx-auto lg:mx-0 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="w-8 h-8 bg-green-500 rounded-lg animate-pulse" />
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tighter leading-none">
                Pantry<span className="text-green-600">Vision.</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-500 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed font-medium">
                Scan beberapa buah dan sayur sekaligus dengan{" "}
                <span className="text-gray-900 font-bold underline decoration-green-500">
                  YOLOv8 multi-object detection
                </span>
                . Kenali bahan segar dan busuk langsung dari satu gambar.
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto lg:mx-0">
                <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <Cpu className="text-green-600 mb-3" size={22} />
                  <p className="text-sm font-black text-gray-900">YOLOv8</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    AI Vision
                  </p>
                </div>

                <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <PackageCheck className="text-green-600 mb-3" size={22} />
                  <p className="text-sm font-black text-gray-900">Multi</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Object
                  </p>
                </div>

                <div className="bg-white/80 border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <ShieldCheck className="text-green-600 mb-3" size={22} />
                  <p className="text-sm font-black text-gray-900">Smart</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Storage
                  </p>
                </div>
              </div>
            </div>

            {/* Scan card */}
            <div className="space-y-4">
              <div className="bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-[3rem] p-5">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="text-left">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.25em]">
                      Live Demo
                    </p>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      Scan Kesegaran
                    </h2>
                  </div>

                  <div className="px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest">
                    Multi Object
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !preview && fileInputRef.current?.click()}
                  className={`relative h-[340px] rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden shadow-sm group cursor-pointer
                    ${
                      isDragging
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 bg-white"
                    }
                    ${
                      preview
                        ? "border-none ring-4 ring-white shadow-xl cursor-default"
                        : ""
                    }`}
                >
                  {preview ? (
                    <>
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover animate-in fade-in zoom-in duration-500"
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetData();
                        }}
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
                        <UploadCloud
                          size={32}
                          className="text-slate-400 group-hover:text-green-500 transition-colors"
                        />
                      </div>

                      <p className="font-black text-xl text-slate-800 tracking-tight">
                        Tarik gambar ke sini
                      </p>

                      <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">
                        Atau klik untuk memilih file
                      </p>

                      <p className="text-[11px] text-slate-300 mt-4 max-w-xs">
                        Gunakan foto berisi beberapa objek, misalnya apel,
                        pisang, kentang, atau jeruk dalam satu frame.
                      </p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                  className="hidden"
                />

                <div className="flex gap-4 mt-4">
                  <button
                    type="button"
                    onClick={runAnalysis}
                    disabled={!file || loading}
                    className="flex-[2] py-5 bg-slate-900 hover:bg-green-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all disabled:bg-slate-100 disabled:text-slate-300 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCcw className="animate-spin" size={18} />
                        Menganalisis...
                      </>
                    ) : (
                      "Mulai Scan"
                    )}
                  </button>

                  {preview && (
                    <button
                      type="button"
                      onClick={resetData}
                      className="flex-1 py-5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold mt-4">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Hasil Deteksi */}
          {result && (
            <section className="animate-in slide-in-from-bottom duration-500 space-y-8">
              <div
                className={`flex items-center gap-3 p-5 rounded-3xl border font-black text-sm
                  ${
                    result.has_rotten
                      ? "bg-red-50 border-red-100 text-red-600"
                      : "bg-green-50 border-green-100 text-green-700"
                  }`}
              >
                {result.has_rotten ? (
                  <>
                    <AlertCircle size={20} />
                    Terdeteksi bahan busuk. Segera pisahkan dari stok segar.
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Semua bahan terdeteksi dalam kondisi segar.
                  </>
                )}

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

                    {annotatedSrc && (
                      <button
                        type="button"
                        onClick={() => setZoomAnnotated((v) => !v)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                      >
                        {zoomAnnotated ? (
                          <ZoomOut size={14} />
                        ) : (
                          <ZoomIn size={14} />
                        )}
                        {zoomAnnotated ? "Kecilkan" : "Perbesar"}
                      </button>
                    )}
                  </div>

                  <div
                    className={`rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-lg transition-all duration-500 bg-white
                    ${zoomAnnotated ? "ring-4 ring-green-500/20" : ""}`}
                  >
                    {annotatedSrc ? (
                      <img
                        src={annotatedSrc}
                        alt="Hasil deteksi YOLO dengan bounding box"
                        className="w-full object-cover transition-all duration-500"
                        style={{
                          maxHeight: zoomAnnotated ? "700px" : "420px",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div className="h-[320px] flex items-center justify-center text-slate-300 font-bold">
                        Annotated image tidak tersedia dari server.
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                    Bounding box dibuat otomatis oleh model YOLO multi-object
                  </p>
                </div>

                {/* Detection list */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Detail per Objek
                  </p>

                  {!result.detections || result.detections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-3 bg-white rounded-[2rem] border border-slate-100">
                      <span className="text-5xl">🔍</span>
                      <p className="text-xs font-bold uppercase tracking-widest">
                        Tidak ada objek terdeteksi
                      </p>
                      <p className="text-[10px] text-slate-300 text-center max-w-xs">
                        Coba foto dengan pencahayaan lebih baik atau objek lebih
                        dekat ke kamera.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {result.detections.map((det, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 flex-shrink-0">
                            {i + 1}
                          </div>

                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 flex-shrink-0">
                            {det.icon || "🍽️"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-800 leading-none">
                              {det.item_name}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${freshnessBadge(
                                  det.freshness_status
                                )}`}
                              >
                                {det.freshness_status}
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p
                              className={`text-xl font-black leading-none ${confColor(
                                det.confidence
                              )}`}
                            >
                              {det.confidence}%
                            </p>

                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                              conf
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center pt-2">
                    Demo scan ini dapat dihubungkan ke Smart Storage PantryVision
                  </p>
                </div>
              </div>

              {/* Smart storage CTA after scan */}
              <div className="bg-slate-900 text-white rounded-[3rem] p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="text-center lg:text-left">
                  <p className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em] mb-3">
                    Smart Storage PantryVision
                  </p>

                  <h3 className="text-3xl font-black tracking-tight mb-3">
                    Pantau kesegaran bahan makanan langsung dari rumah.
                  </h3>

                  <p className="text-slate-400 font-medium max-w-2xl">
                    Gunakan perangkat Smart Storage untuk menyimpan bahan
                    makanan, membaca kondisi ruang penyimpanan, dan menghubungkan
                    hasil scan ke sistem inventori rumah.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionModal(true)}
                    className="px-7 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                  >
                    Berlangganan
                  </button>

                  <a
                    href="/auth/login"
                    className="px-7 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                  >
                    Sudah Punya Alat
                  </a>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

<footer className="relative text-slate-300 bg-gradient-to-b from-slate-950 to-slate-900 border-t border-slate-900">
  {/* Modern gradient top border */}
  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

  <div className="max-w-6xl mx-auto px-6 lg:px-10 py-16">
    <div className="grid md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr_1.3fr] gap-12">
      {/* Brand & Status */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-600 shadow-lg shadow-green-500/10">
            <div className="w-4 h-4 rounded-md bg-slate-950" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight leading-none">
              Pantry<span className="text-green-500">Vision</span>
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 mt-1">
              Smart Food Storage
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed">
          Kelola stok makanan lebih cerdas, pantau masa kedaluwarsa,
          dan temukan rekomendasi resep berbasis AI untuk mengurangi food waste.
        </p>
      </div>

      {/* Product / Quick Links */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
          Product
        </h3>
        <ul className="space-y-3.5 text-sm">
          {[
            { name: "Smart Storage", href: "#" },
            { name: "Expiry Tracker", href: "#" },
            { name: "Grocery Sync", href: "#" },
            { name: "AI Recipes", href: "#" },
            { name: "Multi Object Scan", href: "#" },
          ].map((item, index) => (
            <li key={index}>
              <a
                href={item.href}
                className="group flex items-center text-slate-400 hover:text-green-400 transition-all duration-200"
              >
                <span className="w-0 group-hover:w-3 opacity-0 group-hover:opacity-100 transition-all duration-300 text-green-500 text-xs font-bold">
                  →&nbsp;
                </span>
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Contact Support */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
            Contact Support
          </h3>
          <div className="space-y-4 text-sm text-slate-400">
            <div className="flex items-start gap-3">
              <Headphones size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">
                Butuh bantuan? Tim PantryVision siap membantu Anda.
              </p>
            </div>

            <a
              href="mailto:support@pantry-vision.com"
              className="inline-flex items-center gap-2.5 text-slate-300 hover:text-green-400 transition-colors group"
            >
              <Mail size={18} className="text-green-500 group-hover:scale-110 transition-transform" />
              <span className="border-b border-dashed border-slate-700 group-hover:border-green-500/50 pb-0.5">
                support@pantry-vision.com
              </span>
            </a>

            <div className="flex items-start gap-3">
              <Clock size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">
                Senin – Jumat
                <br />
                <span className="text-slate-500 text-xs font-semibold">09.00 – 17.00 WIB</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
          Newsletter
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Dapatkan tips kurangi food waste dan pembaruan sistem.
        </p>
        <div className="flex flex-col gap-2.5">
          <input
            type="email"
            placeholder="Alamat email Anda..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-green-500/50 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 placeholder-slate-600 transition-all"
          />
          <button
            type="button"
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-green-900/20"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* Copyright / Bottom Bar */}
  <div className="border-t border-slate-900 bg-slate-950/40">
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
      <p>© 2026 PantryVision. All rights reserved.</p>
      <div className="flex gap-6">
        <a href="#" className="hover:text-slate-300 transition-colors">
          Privacy Policy
        </a>
        <a href="#" className="hover:text-slate-300 transition-colors">
          Terms of Service
        </a>
      </div>
    </div>
  </div>
</footer>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowSubscriptionModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-green-600 text-white p-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-100 mb-2">
                  Subscription
                </p>

                <h2 className="text-3xl font-black tracking-tight">
                  Berlangganan Smart Storage
                </h2>

                <p className="text-green-50 text-sm font-medium mt-2 max-w-xl">
                  Aktifkan perangkat Smart Storage PantryVision untuk memantau
                  kesegaran bahan makanan, stok, dan hasil scan dalam satu sistem.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSubscriptionModal(false)}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-4">
              <div className="border border-green-100 bg-green-50 rounded-3xl p-5">
                <div className="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center mb-4">
                  <PackageCheck size={24} />
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-2">
                  Smart Storage Basic
                </h3>

                <p className="text-sm text-slate-500 font-medium mb-4">
                  Cocok untuk penggunaan rumah tangga dengan kebutuhan monitoring
                  bahan makanan harian.
                </p>

                <div className="space-y-2 text-sm text-slate-700 font-bold">
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-green-600" />
                    Monitoring kondisi penyimpanan
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-green-600" />
                    Integrasi hasil scan bahan makanan
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-green-600" />
                    Dashboard inventori sederhana
                  </p>
                </div>
              </div>

              <div className="border border-slate-100 bg-white rounded-3xl p-5 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4">
                  <ShieldCheck size={24} />
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-2">
                  Smart Storage Pro
                </h3>

                <p className="text-sm text-slate-500 font-medium mb-4">
                  Cocok untuk dapur bisnis kecil, pantry kantor, atau pengelolaan
                  stok bahan makanan lebih intensif.
                </p>

                <div className="space-y-2 text-sm text-slate-700 font-bold">
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-green-600" />
                    Multi perangkat Smart Storage
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-green-600" />
                    Riwayat data penyimpanan
                  </p>
                  <p className="flex items-center gap-2">
                    <Check size={16} className="text-green-600" />
                    Prioritas bantuan support
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSupportFromModal}
                className="flex-1 text-center px-6 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
              >
                Hubungi Support
              </button>

              <button
                type="button"
                onClick={() => setShowSubscriptionModal(false)}
                className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}