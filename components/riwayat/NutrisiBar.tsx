'use client'

interface NutrisiBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

export function NutrisiBar({ label, value, max, color }: NutrisiBarProps) {
  // Menghitung persentase, maksimal 100%
  const pct = Math.min((value / max) * 100, 100)

  return (
    <div>
      {/* Label dan Nilai Angka */}
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="text-slate-700 font-bold">{value}</span>
      </div>
      
      {/* Background Bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        {/* Progress Bar dengan Animasi */}
        <div 
          className={`h-full rounded-full ${color} transition-all duration-700`} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  )
}