"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Lock,
  Camera,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Pencil,
  ImagePlus,
} from "lucide-react";

type ToastType = "success" | "error";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: "",
    type: "success",
    visible: false,
  });

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
  };

  // Sinkronisasi dari session
  useEffect(() => {
    if (session?.user) {
      setForm((prev) => ({
        ...prev,
        fullname: session.user.name || "",
        email: session.user.email || "",
      }));
    }
  }, [session]);

  // Cek apakah user login via OAuth
  const isOAuthUser =
    !session?.user?.email?.includes("@") ||
    (session as any)?.user?.provider === "google" ||
    (session as any)?.user?.provider === "github";

  if (status === "loading") {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  // ── Upload avatar ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("File harus berupa gambar", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 2MB", "error");
      return;
    }

    // Tampilkan preview lokal segera
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Update session agar gambar langsung berubah di navbar/layout
      await update({ image: data.avatarUrl });
      showToast("Foto profil berhasil diperbarui", "success");
    } catch (err: any) {
      console.error("avatar upload error:", err);
      setAvatarPreview(null); // rollback preview jika gagal
      showToast(err?.message || "Gagal mengupload foto", "error");
    } finally {
      setUploadingAvatar(false);
      // Reset input agar file yang sama bisa dipilih lagi
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Simpan perubahan profil ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fullname.trim()) {
      showToast("Nama tidak boleh kosong", "error");
      return;
    }

    if (form.password && form.password !== form.confirmPassword) {
      showToast("Konfirmasi password tidak cocok", "error");
      return;
    }

    if (form.password && form.password.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }

    try {
      setSaving(true);

      const payload: { fullname?: string; password?: string } = {};

      if (form.fullname.trim() !== (session?.user?.name || "")) {
        payload.fullname = form.fullname.trim();
      }

      if (form.password) {
        payload.password = form.password;
      }

      if (Object.keys(payload).length === 0) {
        showToast("Tidak ada perubahan untuk disimpan", "success");
        setIsEditing(false);
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      if (payload.fullname) {
        await update({ name: payload.fullname });
      }

      showToast("Profil berhasil diperbarui", "success");
      setIsEditing(false);
      setForm((prev) => ({ ...prev, password: "", confirmPassword: "" }));
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      console.error("handleSave error:", err);
      showToast(err?.message || "Gagal menyimpan perubahan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      fullname: session?.user?.name || "",
      email: session?.user?.email || "",
      password: "",
      confirmPassword: "",
    });
    setIsEditing(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const getInitial = (name: string) => (name ? name.charAt(0).toUpperCase() : "?");

  // Gambar yang ditampilkan: preview lokal > session image > inisial
  const currentImage = avatarPreview || session?.user?.image;

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed top-5 right-5 z-[200] animate-in slide-in-from-top-2 fade-in duration-300">
          <div
            className={`rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 ${
              toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
              className="opacity-70 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* AVATAR CARD */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-green-600" />

            {/* Avatar + tombol ganti foto */}
            <div className="relative mt-8 inline-block">
              <div className="w-32 h-32 mx-auto rounded-[2.5rem] border-4 border-white shadow-2xl bg-slate-50 flex items-center justify-center text-4xl font-black text-green-600 overflow-hidden">
                {currentImage ? (
                  <img src={currentImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  getInitial(form.fullname)
                )}
                {/* Overlay loading saat upload */}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-[2.5rem]">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Tombol kamera */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Ganti foto profil"
                className="absolute -bottom-1 -right-1 w-9 h-9 bg-green-600 hover:bg-green-700 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all disabled:opacity-60 border-2 border-white"
              >
                {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>

              {/* Hidden file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">{form.fullname || "—"}</h2>
              <p className="text-sm text-slate-400 font-medium">{form.email}</p>
              {isOAuthUser && (
                <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-50 text-blue-500 rounded-full border border-blue-100">
                  OAuth Account
                </span>
              )}
              <p className="text-[10px] text-slate-400 mt-3">
                Klik ikon kamera untuk ganti foto
              </p>
            </div>
          </div>
        </div>

        {/* DETAIL PROFIL CARD */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Detail Profil</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-2xl font-bold text-[10px] tracking-widest transition-all"
                >
                  <Pencil size={13} />
                  EDIT PROFIL
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-bold text-[10px] tracking-widest transition-all disabled:opacity-50"
                >
                  BATALKAN
                </button>
              )}
            </div>

            <div className="space-y-8">
              {/* Nama */}
              <InputField
                label="Nama Lengkap"
                icon={<User size={18} />}
                value={form.fullname}
                disabled={!isEditing}
                onChange={(val: string) => setForm({ ...form, fullname: val })}
              />

              {/* Email — selalu disabled */}
              <InputField
                label="Email Address"
                icon={<Mail size={18} />}
                value={form.email}
                disabled={true}
                onChange={() => {}}
                hint="Email tidak dapat diubah"
              />

              {/* Password — hanya saat edit dan bukan OAuth */}
              {isEditing && !isOAuthUser && (
                <>
                  <InputField
                    label="Password Baru"
                    icon={<Lock size={18} />}
                    value={form.password}
                    disabled={false}
                    isPassword
                    showPassword={showPassword}
                    togglePassword={() => setShowPassword(!showPassword)}
                    onChange={(val: string) => setForm({ ...form, password: val })}
                    placeholder="Kosongkan jika tidak ingin mengubah"
                  />
                  {form.password && (
                    <InputField
                      label="Konfirmasi Password"
                      icon={<Lock size={18} />}
                      value={form.confirmPassword}
                      disabled={false}
                      isPassword
                      showPassword={showConfirmPassword}
                      togglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                      onChange={(val: string) => setForm({ ...form, confirmPassword: val })}
                      placeholder="Ulangi password baru"
                    />
                  )}
                </>
              )}

              {/* Info OAuth */}
              {isEditing && isOAuthUser && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <AlertCircle size={16} className="text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-600 font-medium">
                    Akun OAuth (Google/GitHub) tidak dapat mengubah password melalui aplikasi ini.
                  </p>
                </div>
              )}

              {/* Info ganti foto saat edit */}
              {isEditing && (
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <ImagePlus size={16} className="text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-500 font-medium">
                    Untuk mengganti foto profil, klik ikon kamera di foto avatar sebelah kiri.
                  </p>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="mt-12 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-green-200 transition-all active:scale-95 tracking-widest uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      Simpan Perubahan
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  icon,
  value,
  disabled,
  onChange,
  isPassword,
  showPassword,
  togglePassword,
  placeholder,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  disabled: boolean;
  onChange: (val: string) => void;
  isPassword?: boolean;
  showPassword?: boolean;
  togglePassword?: () => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2 group text-left">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
        {label}
        {hint && <span className="normal-case tracking-normal font-medium text-slate-300">— {hint}</span>}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-green-600 transition-colors">
          {icon}
        </div>
        <input
          type={isPassword ? (showPassword ? "text" : "password") : "text"}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-12 ${isPassword ? "pr-12" : "pr-6"} py-4 rounded-2xl border-2 transition-all outline-none font-bold text-sm ${
            disabled
              ? "bg-slate-50/50 border-transparent text-slate-500 cursor-not-allowed"
              : "bg-white border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/5 text-slate-800 shadow-sm"
          }`}
        />
        {isPassword && !disabled && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-green-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
