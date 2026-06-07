import { supabase } from './supabase'

export async function getRecipesByIngredients(userIngredients: string[]) {
  if (!userIngredients || userIngredients.length === 0) return []

  // Ambil semua resep beserta bahan-bahannya
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select(`
      id,
      title,
      instructions,
      image,
      calories,
      recipe_ingredients ( ingredient_name )
    `)

  if (error) {
    console.error('Error fetching recipes:', error)
    return []
  }

  // Normalisasi input user: lowercase & trim
  const normalizedUserIngredients = userIngredients.map(ing =>
    ing.toLowerCase().trim()
  )

  // Filter & map
  return recipes
    .filter((recipe: any) =>
      recipe.recipe_ingredients.some((ri: any) => {
        const normalizedDB = ri.ingredient_name.toLowerCase().trim()
        return normalizedUserIngredients.includes(normalizedDB)
      })
    )
    .map((r: any) => ({
      id: r.id,
      title: r.title,
      instructions: r.instructions,
      image: r.image,
      calories: r.calories,
      ingredients: r.recipe_ingredients.map((ri: any) => ri.ingredient_name),
    }))
}