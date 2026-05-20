'use client'

import { X, ChefHat, Timer, Users, Utensils } from 'lucide-react'

interface RecipeModalProps {
  recipe: any | null
  onClose: () => void
}

export function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  if (!recipe) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-white relative flex flex-col">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white/20 backdrop-blur-md text-white hover:bg-white/40 rounded-full transition-all z-10"
        >
          <X size={24} />
        </button>

        {/* Header Image */}
        <div className="h-64 shrink-0 relative">
          <img 
            src={recipe.image} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{recipe.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8">
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-1">
              <Timer className="text-green-600" size={18} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</span>
              <span className="text-xs font-black text-slate-800">20 - 30 Menit</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-1">
              <Users className="text-green-600" size={18} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Porsi</span>
              <span className="text-xs font-black text-slate-800">2 Orang</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center gap-1">
              <ChefHat className="text-green-600" size={18} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Level</span>
              <span className="text-xs font-black text-slate-800">Mudah</span>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <Utensils size={16} className="text-green-600" />
              Bahan yang Dibutuhkan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recipe.ingredients.map((ing: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-green-600" />
                  <span className="text-sm font-bold text-slate-700">{ing}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <ChefHat size={16} className="text-green-600" />
              Cara Membuat
            </h4>
            <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 text-slate-700 text-sm leading-relaxed font-medium">
              {recipe.instructions}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
