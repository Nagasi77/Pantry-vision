import { supabase } from './supabase'

export async function getRecipesByIngredients(userIngredients: string[]) {
  if (!userIngredients || userIngredients.length === 0) return []

  const normalizedUserIngredients = userIngredients.map(ing =>
    ing.toLowerCase().trim()
  )

  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')

  if (recipesError || !recipes) return []

  const { data: allIngredients, error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select('*')

  if (ingredientsError || !allIngredients) return []

  const recipesWithIngredients = recipes.map(recipe => ({
    ...recipe,
    ingredients: allIngredients
      .filter(ing => ing.recipe_id === recipe.id)
      .map(ing => ing.ingredient_name),
  }))

  return recipesWithIngredients
    .filter(recipe =>
      recipe.ingredients.some(ing =>
        normalizedUserIngredients.includes(ing.toLowerCase().trim())
      )
    )
    .map(r => ({
      id: r.id,
      title: r.title,
      instructions: r.instructions,
      image: r.image,
      calories: r.calories,
      ingredients: r.ingredients,
    }))
}