export async function getRecipesByIngredients(ingredients: string[]) {
  // Dataset resep lokal sederhana sebagai fallback/fase awal
  const recipeDatabase = [
    {
      id: 1,
      title: "Salad Buah Segar",
      ingredients: ["Apel", "Pisang", "Melon"],
      instructions: "Potong semua buah, campurkan dalam wadah, tambahkan yogurt jika ada.",
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80"
    },
    {
      id: 2,
      title: "Tumis Sayur Pelangi",
      ingredients: ["Wortel", "Bayam", "Jagung"],
      instructions: "Tumis bawang merah dan putih, masukkan sayuran, tambahkan garam dan merica.",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80"
    },
    {
      id: 3,
      title: "Smoothie Booster",
      ingredients: ["Pisang", "Bayam", "Susu"],
      instructions: "Blender semua bahan hingga halus. Sajikan dingin.",
      image: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=500&q=80"
    },
    {
      id: 4,
      title: "Apel Panggang Kayu Manis",
      ingredients: ["Apel", "Gula Merah", "Kayu Manis"],
      instructions: "Iris apel, taburi gula dan kayu manis, panggang selama 15 menit.",
      image: "https://images.unsplash.com/photo-1568571780765-9276ac4125a3?w=500&q=80"
    }
  ];

  // Logika pencocokan sederhana: cari resep yang mengandung setidaknya satu bahan yang dimiliki user
  const recommendations = recipeDatabase.filter(recipe => 
    recipe.ingredients.some(reqIngredient => 
      ingredients.some(userIngredient => 
        userIngredient.toLowerCase().includes(reqIngredient.toLowerCase())
      )
    )
  );

  return recommendations;
}
