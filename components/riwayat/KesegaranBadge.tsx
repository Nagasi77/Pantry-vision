import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export const kesegaranConfig = {
  'Segar':       { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: CheckCircle },
  'Cukup Segar': { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   Icon: AlertTriangle },
  'Tidak Segar': { color: 'text-red-600',      bg: 'bg-red-50',      border: 'border-red-200',      Icon: XCircle },
}

export function KesegaranBadge({ status }: { status: 'Segar' | 'Cukup Segar' | 'Tidak Segar' }) {
  const cfg = kesegaranConfig[status]
  const { Icon } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon size={11} />{status}
    </span>
  )
}