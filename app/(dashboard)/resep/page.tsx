'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '../../lib/supabase'
import { getRecipesByIngredients } from '../../lib/recipeService'
import { Loader2, Utensils, ChefHat, ArrowRight } from 'lucide-react'

export default function ResepPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<any[]>([])
  const [availableItems, setAvailableItems] = useState<string[]>([])

  useEffect(() => {
    async function fetchInventoryAndRecipes() {
      if (status === "authenticated" && session?.user?.id) {
        try {
          setLoading(true)
          
          // 1. Ambil bahan makanan yang "Segar" dari database
          const { data: items, error } = await supabase
            .from('pantry_items')
            .select('item_name')
            .eq('user_id', session.user.id)
            .eq('freshness_status', 'Segar')

          if (error) throw error

          const itemNames = items?.map(i => i.item_name) || []
          setAvailableItems(itemNames)

          // 2. Dapatkan rekomendasi resep
          const recommended = await getRecipesByIngredients(itemNames)
          setRecipes(recommended)
        } catch (err) {
          console.error("Error fetching recipes:", err)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchInventoryAndRecipes()
  }, [session, status])

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Mencari Inspirasi Masak...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <ChefHat className="text-blue-600" size={32} />
          Inspirasi Dapur
        </h2>
        <p className="text-slate-500 font-medium">Resep pilihan berdasarkan stok segar di pantry Anda.</p>
      </div>

      {availableItems.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2 py-2">Bahan Anda:</span>
          {availableItems.map((item, idx) => (
            <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-700 text-sm font-medium">
          Belum ada bahan segar terdeteksi. Silakan lakukan pemindaian terlebih dahulu!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {recipes.length > 0 ? (
          recipes.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden hover:scale-[1.02] transition-all group">
              <div className="h-48 overflow-hidden relative">
                <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-blue-600 shadow-sm">
                  {recipe.ingredients.length} Bahan
                </div>
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-xl font-black text-slate-800 leading-tight">{recipe.title}</h3>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bahan Utama:</p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.ingredients.map((ing: string, i: number) => (
                      <span key={i} className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                  Lihat Resep <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300">
            <Utensils size={64} strokeWidth={1} />
            <p className="mt-4 text-sm font-bold uppercase tracking-widest">Belum ada resep yang cocok</p>
          </div>
        )}
      </div>
    </div>
  )
}
