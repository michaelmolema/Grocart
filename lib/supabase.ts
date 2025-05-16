import { createClient } from "@supabase/supabase-js"
import type { PantryItem } from "@/types/pantry"
import type { Label } from "@/types/label"
import { getNext10Days } from "./utils"

// Voeg deze debug functie toe aan het begin van het bestand, na de imports

// Debug functie om problemen met Supabase queries te identificeren
function logQueryError(functionName: string, error: any) {
  console.error(`Error in ${functionName}:`, error)
  console.error(`Error details:`, JSON.stringify(error, null, 2))
}

// Create a single supabase client for the entire app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functies voor database operaties

// Add these export functions for label management at the appropriate location in the file
// (Add them right after the getLabels function)

export async function getLabels(): Promise<Label[]> {
  const { data, error } = await supabase.from("labels").select("*").order("name")

  if (error) {
    console.error("Error fetching labels:", error)
    throw error
  }

  return data || []
}

export async function addLabel(label: Omit<Label, "id">): Promise<Label> {
  const { data, error } = await supabase.from("labels").insert([label]).select().single()

  if (error) {
    console.error("Error adding label:", error)
    throw error
  }

  return data
}

export async function updateLabel(label: Label): Promise<Label> {
  const { data, error } = await supabase.from("labels").update(label).eq("id", label.id).select().single()

  if (error) {
    console.error("Error updating label:", error)
    throw error
  }

  return data
}

export async function deleteLabel(id: number): Promise<void> {
  const { error } = await supabase.from("labels").delete().eq("id", id)

  if (error) {
    console.error("Error deleting label:", error)
    throw error
  }
}

export async function initializeLabelsTable(defaultLabels: Omit<Label, "id">[]): Promise<void> {
  const { data: existingLabels, error: fetchError } = await supabase.from("labels").select("*")

  if (fetchError) {
    console.error("Error checking existing labels:", fetchError)
    throw fetchError
  }

  // Only initialize if there are no labels yet
  if (existingLabels && existingLabels.length === 0) {
    const { error: insertError } = await supabase.from("labels").insert(defaultLabels)

    if (insertError) {
      console.error("Error initializing labels:", insertError)
      throw insertError
    }
  }
}

// Remove the dummy getLabels function that was added earlier

export async function getRecipes() {
  console.log("getRecipes functie aangeroepen")
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

  try {
    console.log("Supabase query uitvoeren...")
    const { data, error } = await supabase.from("recipes").select("*").order("title")

    if (error) {
      console.error("Error fetching recipes:", error)
      throw error
    }

    console.log("Recepten opgehaald:", data)
    return data || []
  } catch (err) {
    console.error("Onverwachte fout bij het ophalen van recepten:", err)
    throw err
  }
}

// Functie om recepten op te halen met een specifieke sortering
export async function getRecipesSorted(sortBy: string) {
  try {
    let query = supabase.from("recipes").select("*")

    // Sorteer op basis van de opgegeven kolom
    switch (sortBy) {
      case "title":
        query = query.order("title", { ascending: true })
        break
      case "title-desc":
        query = query.order("title", { ascending: false })
        break
      case "color":
        // Eerst op kleur (niet-lege kleuren eerst), dan op titel
        query = query.order("color", { ascending: false, nullsFirst: false }).order("title")
        break
      case "position":
        // Sorteer op positie (voor handmatige sortering)
        query = query.order("position", { ascending: true, nullsLast: true })
        break
      default:
        query = query.order("title")
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching sorted recipes:", error)
      throw error
    }

    return data || []
  } catch (err) {
    console.error("Unexpected error fetching sorted recipes:", err)
    throw err
  }
}

export async function getRecipeWithIngredients(recipeId: string) {
  console.log("getRecipeWithIngredients aangeroepen met ID:", recipeId)

  try {
    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", recipeId).single()

    if (recipeError) {
      console.error("Error fetching recipe:", recipeError)
      throw recipeError
    }

    const { data: ingredients, error: ingredientsError } = await supabase
      .from("ingredients")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("id")

    if (ingredientsError) {
      console.error("Error fetching ingredients:", ingredientsError)
      return { ...recipe, ingredients: [] }
    }

    return { ...recipe, ingredients: ingredients || [] }
  } catch (err) {
    console.error("Onverwachte fout bij het ophalen van recept met ingrediënten:", err)
    throw err
  }
}

export async function createRecipe(title: string, instructions: string, color = "") {
  try {
    console.log("Creating recipe:", { title, instructions, color })

    const { data, error } = await supabase.from("recipes").insert([{ title, instructions, color }]).select()

    if (error) {
      console.error("Error creating recipe:", error)
      throw error
    }

    console.log("Recipe created successfully:", data?.[0])
    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error creating recipe:", err)
    throw err
  }
}

export async function updateRecipe(id: string, title: string, instructions: string, color = "") {
  const { data, error } = await supabase.from("recipes").update({ title, instructions, color }).eq("id", id).select()

  if (error) {
    console.error("Error updating recipe:", error)
    return null
  }

  return data?.[0] || null
}

// Functie om een recept te verwijderen
export async function deleteRecipe(id: string) {
  try {
    console.log("Starting to delete recipe with ID:", id)

    // Stap 1: Controleer of er shopping_list_items zijn die naar dit recept verwijzen
    try {
      console.log("Checking for shopping list items referencing this recipe")
      const { error: shoppingListCheckError } = await supabase.from("shopping_list_items").delete().eq("recipe_id", id)

      if (shoppingListCheckError) {
        console.log("No shopping_list_items table or no items found, continuing...")
      } else {
        console.log("Deleted any shopping list items referencing this recipe")
      }
    } catch (err) {
      console.log("Error checking shopping list items, continuing with deletion:", err)
      // We gaan door met verwijderen, zelfs als deze stap mislukt
    }

    // Stap 2: Verwijder alle ingrediënten die bij dit recept horen
    console.log("Deleting ingredients for recipe:", id)
    try {
      const { error: ingredientsError } = await supabase.from("ingredients").delete().eq("recipe_id", id)

      if (ingredientsError) {
        console.error("Error deleting recipe ingredients:", ingredientsError)
        // We gaan door met verwijderen, zelfs als deze stap mislukt
      } else {
        console.log("Successfully deleted ingredients for recipe:", id)
      }
    } catch (err) {
      console.error("Unexpected error deleting ingredients:", err)
      // We gaan door met verwijderen, zelfs als deze stap mislukt
    }

    // Stap 3: Verwijder alle geplande maaltijden die dit recept gebruiken
    console.log("Deleting planned meals for recipe:", id)
    try {
      const { error: plannedMealsError } = await supabase.from("planned_meals").delete().eq("recipe_id", id)

      if (plannedMealsError) {
        console.error("Error deleting planned meals for recipe:", plannedMealsError)
        // We gaan door met verwijderen, zelfs als deze stap mislukt
      } else {
        console.log("Successfully deleted planned meals for recipe:", id)
      }
    } catch (err) {
      console.error("Unexpected error deleting planned meals:", err)
      // We gaan door met verwijderen, zelfs als deze stap mislukt
    }

    // Stap 4: Verwijder het recept zelf
    console.log("Deleting the recipe itself:", id)
    const { error } = await supabase.from("recipes").delete().eq("id", id)

    if (error) {
      console.error("Error deleting recipe:", error)
      throw error
    }

    console.log("Recipe successfully deleted:", id)
    return true
  } catch (err) {
    console.error("Unexpected error deleting recipe:", err)
    throw err
  }
}

export async function addIngredient(
  recipeId: string,
  name: string,
  quantity: string,
  label = "",
  shopping_text = "",
  position = 0,
) {
  try {
    console.log("Adding ingredient:", { recipeId, name, quantity, label, shopping_text, position })

    const { data, error } = await supabase
      .from("ingredients")
      .insert([
        {
          recipe_id: recipeId,
          name,
          quantity,
          label,
          shopping_text,
          position,
        },
      ])
      .select()

    if (error) {
      console.error("Error adding ingredient:", error)
      throw error
    }

    console.log("Ingredient added successfully:", data?.[0])
    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error adding ingredient:", err)
    throw err
  }
}

export async function updateIngredient(
  id: string,
  name: string,
  quantity: string,
  label: string,
  shopping_text = "",
  position = 0,
) {
  const { data, error } = await supabase
    .from("ingredients")
    .update({ name, quantity, label, shopping_text, position })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error updating ingredient:", error)
    return null
  }

  return data?.[0] || null
}

export async function deleteIngredient(id: string) {
  const { error } = await supabase.from("ingredients").delete().eq("id", id)

  if (error) {
    console.error("Error deleting ingredient:", error)
    return false
  }

  return true
}

// Functie om verstreken geplande maaltijden op te ruimen
export async function cleanupExpiredMeals() {
  try {
    console.log("Starting cleanup of expired planned meals...")

    // Haal de huidige datum op in ISO formaat (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0]

    // Haal eerst alle verstreken geplande maaltijden op
    const { data: expiredMeals, error: fetchError } = await supabase
      .from("planned_meals")
      .select("id, recipe_id")
      .lt("date", today)

    if (fetchError) {
      console.error("Error fetching expired meals:", fetchError)
      return false
    }

    console.log(`Found ${expiredMeals?.length || 0} expired planned meals`)

    if (!expiredMeals || expiredMeals.length === 0) {
      console.log("No expired meals to clean up")
      return true
    }

    // Verwijder alle verstreken geplande maaltijden
    const { error: deleteError } = await supabase.from("planned_meals").delete().lt("date", today)

    if (deleteError) {
      console.error("Error deleting expired meals:", deleteError)
      return false
    }

    console.log("Successfully deleted expired planned meals")

    // Probeer ook eventuele shopping_list_items op te ruimen die naar deze recepten verwijzen
    try {
      const recipeIds = expiredMeals.map((meal) => meal.recipe_id)

      if (recipeIds.length > 0) {
        const { error: shoppingListError } = await supabase
          .from("shopping_list_items")
          .delete()
          .in("recipe_id", recipeIds)

        if (shoppingListError) {
          console.log("Error cleaning up shopping list items:", shoppingListError)
        } else {
          console.log("Successfully cleaned up related shopping list items")
        }
      }
    } catch (err) {
      console.error("Error during shopping list cleanup:", err)
    }

    return true
  } catch (err) {
    console.error("Unexpected error during expired meals cleanup:", err)
    return false
  }
}

// Aangepaste functie om geplande maaltijden op te halen (alleen komende 10 dagen)
export async function getPlannedMeals() {
  try {
    // Roep eerst de cleanup functie aan om verstreken maaltijden op te ruimen
    await cleanupExpiredMeals()

    // Haal de huidige datum op in ISO formaat (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0]

    // Bereken de datum over 10 dagen
    const tenDaysFromNow = new Date()
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10)
    const tenDaysDate = tenDaysFromNow.toISOString().split("T")[0]

    // Haal alleen geplande maaltijden op voor de komende 10 dagen
    const { data, error } = await supabase
      .from("planned_meals")
      .select(`
        *,
        recipes (
          id,
          title,
          color
        )
      `)
      .gte("date", today)
      .lt("date", tenDaysDate)
      .order("date")

    if (error) {
      console.error("Error fetching planned meals:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Unexpected error fetching planned meals:", err)
    return []
  }
}

export async function addPlannedMeal(recipeId: string, date: string, mealType = "dinner") {
  const { data, error } = await supabase
    .from("planned_meals")
    .insert([{ recipe_id: recipeId, date, meal_type: mealType }])
    .select()

  if (error) {
    console.error("Error adding planned meal:", error)
    return null
  }

  return data?.[0] || null
}

export async function removePlannedMeal(id: string) {
  const { error } = await supabase.from("planned_meals").delete().eq("id", id)

  if (error) {
    console.error("Error removing planned meal:", error)
    return false
  }

  return true
}

// Aangepaste functie om de boodschappenlijst op te halen (alleen voor komende 10 dagen)
export async function getShoppingList() {
  try {
    // Roep eerst de cleanup functie aan om verstreken maaltijden op te ruimen
    await cleanupExpiredMeals()

    // Haal de huidige datum op in ISO formaat (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0]

    // Bereken de datum over 10 dagen
    const tenDaysFromNow = new Date()
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10)
    const tenDaysDate = tenDaysFromNow.toISOString().split("T")[0]

    // Deze query haalt alle ingrediënten op voor geplande maaltijden in de komende 10 dagen
    // Gebruik een expliciete lijst van kolommen in plaats van * om problemen te voorkomen
    const { data, error } = await supabase
      .from("planned_meals")
      .select(`
        date,
        recipes (
          id,
          title,
          ingredients (
            id,
            name,
            quantity,
            label,
            shopping_text
          )
        )
      `)
      .gte("date", today)
      .lt("date", tenDaysDate)
      .order("date")

    if (error) {
      console.error("Error fetching shopping list:", error)
      return []
    }

    // Verwerk de data om een boodschappenlijst te maken
    const ingredients: any[] = []

    data.forEach((meal) => {
      if (meal.recipes && meal.recipes.ingredients) {
        meal.recipes.ingredients.forEach((ingredient: any) => {
          // Bepaal de tekst die moet worden weergegeven
          const displayName =
            ingredient.shopping_text && ingredient.shopping_text.trim() ? ingredient.shopping_text : ingredient.name
          const displayQuantity = ingredient.shopping_text && ingredient.shopping_text.trim() ? "" : ingredient.quantity

          // Controleer of het ingredient al in de lijst staat
          const existingIndex = ingredients.findIndex(
            (i) => i.name.toLowerCase() === displayName.toLowerCase() && i.label === ingredient.label,
          )

          if (existingIndex >= 0) {
            // Voeg hoeveelheden samen (dit is een simpele implementatie)
            if (displayQuantity) {
              ingredients[existingIndex].quantity += `, ${displayQuantity}`
            }
            ingredients[existingIndex].recipes.push({
              id: meal.recipes.id,
              title: meal.recipes.title,
              date: meal.date,
            })
          } else {
            // Voeg nieuw ingredient toe
            ingredients.push({
              ...ingredient,
              name: displayName, // Gebruik de shopping_text als naam indien beschikbaar
              quantity: displayQuantity,
              checked: false,
              recipes: [
                {
                  id: meal.recipes.id,
                  title: meal.recipes.title,
                  date: meal.date,
                },
              ],
            })
          }
        })
      }
    })

    return ingredients
  } catch (err) {
    console.error("Error getting shopping list:", err)
    return []
  }
}

// Functie om de positie van een recept bij te werken (voor drag & drop sortering)
export async function updateRecipePosition(id: string, position: number) {
  const { data, error } = await supabase.from("recipes").update({ position }).eq("id", id).select()

  if (error) {
    console.error("Error updating recipe position:", error)
    return null
  }

  return data?.[0] || null
}

// Pantry functies
export async function getPantryItems(): Promise<PantryItem[]> {
  const { data, error } = await supabase.from("pantry_items").select("*").order("name")

  if (error) {
    console.error("Error fetching pantry items:", error)
    throw error
  }

  return data || []
}

export async function addPantryItemOld(item: Omit<PantryItem, "id">): Promise<PantryItem> {
  const { data, error } = await supabase.from("pantry_items").insert([item]).select().single()

  if (error) {
    console.error("Error adding pantry item:", error)
    throw error
  }

  return data
}

export async function updatePantryItemOld(item: PantryItem): Promise<PantryItem> {
  const { data, error } = await supabase.from("pantry_items").update(item).eq("id", item.id).select().single()

  if (error) {
    console.error("Error updating pantry item:", error)
    throw error
  }

  return data
}

export async function deletePantryItem(id: number): Promise<void> {
  const { error } = await supabase.from("pantry_items").delete().eq("id", id)

  if (error) {
    console.error("Error deleting pantry item:", error)
    throw error
  }
}

// Functie om te controleren of er geplande maaltijden zijn
export async function hasPlannedMeals() {
  try {
    // Eerst verwijderen we verstreken geplande maaltijden
    await cleanupExpiredMeals()

    // Haal de datums op voor de komende 10 dagen
    const next10Days = getNext10Days()
    const validDates = next10Days.map((day) => day.value)

    // Tel het aantal geplande maaltijden binnen deze datums
    const { count, error } = await supabase
      .from("planned_meals")
      .select("*", { count: "exact", head: true })
      .in("date", validDates)

    if (error) {
      console.error("Error checking for planned meals:", error)
      return false
    }

    return count !== null && count > 0
  } catch (err) {
    console.error("Unexpected error checking for planned meals:", err)
    return false
  }
}

// Voeg deze functie toe om te controleren of de checked kolom bestaat en deze toe te voegen indien nodig
export async function ensureCheckedColumnExists() {
  try {
    console.log("Checking if checked column exists in pantry_items table...")

    // Probeer een query uit te voeren die de checked kolom gebruikt
    const { error } = await supabase.from("pantry_items").select("checked").limit(1)

    // Als er een error is, bestaat de kolom waarschijnlijk niet
    if (error) {
      console.log("The 'checked' column doesn't exist in pantry_items table, attempting to add it...")

      // Voeg de kolom toe met een SQL query
      // Dit moet via een RPC call of een SQL query omdat Supabase geen directe API heeft om kolommen toe te voegen
      try {
        // Voeg de checked kolom toe
        await supabase.rpc("add_checked_column_to_pantry_items")
        console.log("Successfully added 'checked' column to pantry_items table")
        return true
      } catch (rpcErr) {
        console.error("Error adding checked column via RPC:", rpcErr)
        console.log("Note: You may need to manually add the 'checked' column to the pantry_items table")
        return false
      }
    }

    console.log("The 'checked' column already exists in pantry_items table")
    return true
  } catch (err) {
    console.error("Error checking for checked column:", err)
    return false
  }
}

// Verbeter de getShoppingListWithPantryItems functie om de checked status correct op te halen
export async function getShoppingListWithPantryItems() {
  try {
    // Zorg ervoor dat de checked kolom bestaat
    await ensureCheckedColumnExists()

    // Haal eerst de normale boodschappenlijst op (deze roept al cleanupExpiredMeals aan)
    const mealIngredients = await getShoppingList()

    // Haal pantry items op die aan de boodschappenlijst zijn toegevoegd
    // Gebruik een directe query zonder OR conditie om problemen te voorkomen
    const { data: pantryItems, error } = await supabase.from("pantry_items").select("*").eq("added_to_list", true)

    if (error) {
      console.error("Error fetching pantry items for shopping list:", error)
      return mealIngredients
    }

    // Log de opgehaalde pantry items voor debugging
    console.log(
      `Retrieved ${pantryItems.length} pantry items for shopping list:`,
      pantryItems.map((item) => ({ id: item.id, name: item.name, checked: item.checked })),
    )

    // Converteer pantry items naar hetzelfde formaat als de ingrediënten
    const pantryIngredients = pantryItems.map((item) => {
      // Extraheer het aantal uit de quantity string
      let count = 1
      let baseQuantity = item.quantity || ""
      const countMatch = baseQuantity.match(/^(\d+)x\s*(.*)$/)

      if (countMatch) {
        count = Number.parseInt(countMatch[1], 10)
        baseQuantity = countMatch[2]
      }

      // Zorg ervoor dat we de checked status correct meenemen
      return {
        id: item.id,
        name: item.name,
        quantity: count > 1 ? `${count}x ${baseQuantity}`.trim() : baseQuantity,
        label: item.label || "empty",
        checked: !!item.checked, // Zorg voor een boolean waarde
        checked_at: item.checked_at || null,
        fromPantry: true,
        position: item.position || 0,
      }
    })

    // Log de afgevinkte items voor debugging
    const checkedItems = pantryIngredients.filter((item) => item.checked)
    if (checkedItems.length > 0) {
      console.log(
        `Found ${checkedItems.length} checked pantry items:`,
        checkedItems.map((item) => ({ id: item.id, name: item.name })),
      )
    }

    // Combineer beide lijsten - zelfs als mealIngredients leeg is
    return [...mealIngredients, ...pantryIngredients]
  } catch (err) {
    console.error("Error getting combined shopping list:", err)
    return []
  }
}

// Wijzig de updateShoppingListItem functie om checked_at correct bij te werken
export async function updateShoppingListItem(id: string, updates: { checked?: boolean; checked_at?: string | null }) {
  try {
    // Als checked_at niet expliciet is opgegeven maar checked wel, stel dan checked_at in
    if (updates.checked !== undefined && updates.checked_at === undefined) {
      updates = {
        ...updates,
        checked_at: updates.checked ? new Date().toISOString() : null,
      }
    }

    // First check if the pantry_items table has the checked column
    let hasCheckedColumn = false
    try {
      const { count, error } = await supabase
        .from("pantry_items")
        .select("id", { count: "exact", head: true })
        .eq("checked", true)
        .limit(1)

      // If no error, the column exists
      hasCheckedColumn = !error
    } catch (err) {
      console.log("The 'checked' column doesn't exist in pantry_items table")
      hasCheckedColumn = false
    }

    // Probeer eerst de pantry_items tabel
    try {
      // Only include checked fields if the column exists
      const updateData = hasCheckedColumn
        ? updates
        : {
            ...updates,
            checked: undefined,
            checked_at: undefined,
          }

      // Remove undefined fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      // Only proceed if there are fields to update
      if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabase.from("pantry_items").update(updateData).eq("id", id).select()

        if (!error && data && data.length > 0) {
          return data[0]
        }
      }
    } catch (err) {
      console.log("Item not found in pantry_items table or column doesn't exist")
    }

    // Als dat niet lukt, probeer de ingredients tabel
    try {
      const { data, error } = await supabase.from("ingredients").update(updates).eq("id", id).select()

      if (!error && data && data.length > 0) {
        return data[0]
      }
    } catch (err) {
      console.log("Item not found in ingredients table")
    }

    // Als dat niet lukt, probeer de shopping_list_items tabel
    try {
      const { data, error } = await supabase.from("shopping_list_items").update(updates).eq("id", id).select()

      if (!error && data && data.length > 0) {
        return data[0]
      }
    } catch (err) {
      console.log("Item not found in shopping_list_items table or table doesn't exist")
    }

    console.log("Could not update item", id)
    return { id, ...updates }
  } catch (err) {
    console.error("Unexpected error updating shopping list item:", err)
    throw err
  }
}

// Functie om de database op te schonen
export async function cleanupDatabase() {
  try {
    console.log("Starting database cleanup...")

    // Haal actieve labels op
    const labels = await getLabels()
    const validLabelIds = labels.map((label) => label.id)

    console.log("Valid label IDs:", validLabelIds)

    // 1. Update ingrediënten met ongeldige labels naar 'empty'
    try {
      if (validLabelIds.length > 0) {
        const { data: updatedIngredients, error: ingredientsError } = await supabase
          .from("ingredients")
          .update({ label: "empty" })
          .not("label", "in", `(${validLabelIds.map((id) => `'${id}'`).join(",")})`)
          .not("label", "eq", "empty")

        if (ingredientsError) {
          console.error("Error updating ingredients with invalid labels:", ingredientsError)
        } else {
          console.log("Updated ingredients with invalid labels to 'empty'")
        }
      }
    } catch (err) {
      console.error("Error during ingredients cleanup:", err)
    }

    // 2. Update pantry items met ongeldige labels naar 'empty'
    try {
      if (validLabelIds.length > 0) {
        const { data: updatedPantryItems, error: pantryError } = await supabase
          .from("pantry_items")
          .update({ label: "empty" })
          .not("label", "in", `(${validLabelIds.map((id) => `'${id}'`).join(",")})`)
          .not("label", "eq", "empty")

        if (pantryError) {
          console.error("Error updating pantry items with invalid labels:", pantryError)
        } else {
          console.log("Updated pantry items with invalid labels to 'empty'")
        }
      }
    } catch (err) {
      console.error("Error during pantry items cleanup:", err)
    }

    // 3. Probeer shopping_list_items op te schonen als die tabel bestaat
    try {
      // Controleer eerst of de tabel bestaat
      const { error: checkError } = await supabase.from("shopping_list_items").select("count").limit(1)

      if (!checkError) {
        // Tabel bestaat, update items met ongeldige labels
        if (validLabelIds.length > 0) {
          const { error: shoppingListError } = await supabase
            .from("shopping_list_items")
            .update({ label: "empty" })
            .not("label", "in", `(${validLabelIds.map((id) => `'${id}'`).join(",")})`)
            .not("label", "eq", "empty")

          if (shoppingListError) {
            console.error("Error updating shopping list items with invalid labels:", shoppingListError)
          } else {
            console.log("Updated shopping list items with invalid labels to 'empty'")
          }
        }
      }
    } catch (err) {
      console.error("Error during shopping list items cleanup:", err)
    }

    console.log("Database cleanup completed")
    return true
  } catch (err) {
    console.error("Error during database cleanup:", err)
    return false
  }
}

// Pantry lijst functies
// Verbeter de getPantryLists functie om beter met fouten om te gaan
// Vervang de bestaande functie met deze verbeterde versie:

export async function getPantryLists() {
  try {
    console.log("Starting getPantryLists...")

    const { data, error } = await supabase.from("pantry_lists").select("*").order("position")

    if (error) {
      logQueryError("getPantryLists", error)
      return []
    }

    console.log(`Retrieved ${data?.length || 0} pantry lists`)
    return data || []
  } catch (err) {
    console.error("Unexpected error in getPantryLists:", err)
    // Return een lege array in plaats van een fout te gooien
    return []
  }
}

// Voeg deze functie toe of pas de bestaande functie aan om de kleur te ondersteunen
export async function addPantryList(title: string, color = "gray") {
  try {
    // Bepaal de hoogste positie
    const { data: positionData } = await supabase
      .from("pantry_lists")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
    const position = positionData && positionData.length > 0 ? positionData[0].position + 1 : 1

    // Verwijder de color parameter uit de insert
    const { data, error } = await supabase.from("pantry_lists").insert([{ title, position }]).select()

    if (error) {
      console.error("Error adding pantry list:", error)
      throw error
    }

    // Voeg de color toe aan het resultaat voor de UI
    const result = data?.[0] || null
    if (result) {
      // @ts-ignore - We voegen color toe voor UI doeleinden
      result.color = color
    }

    return result
  } catch (err) {
    console.error("Unexpected error adding pantry list:", err)
    return null
  }
}

export async function updatePantryList(id: string, title: string, color = "gray") {
  try {
    // Verwijder de color parameter uit de update
    const { data, error } = await supabase.from("pantry_lists").update({ title }).eq("id", id).select()

    if (error) {
      console.error("Error updating pantry list:", error)
      throw error
    }

    // Voeg de color toe aan het resultaat voor de UI
    const result = data?.[0] || null
    if (result) {
      // @ts-ignore - We voegen color toe voor UI doeleinden
      result.color = color
    }

    return result
  } catch (err) {
    console.error("Unexpected error updating pantry list:", err)
    return null
  }
}

export async function deletePantryList(id: string) {
  try {
    // Eerst verwijderen we alle items in deze lijst
    const { error: itemsError } = await supabase.from("pantry_items").delete().eq("list_id", id)

    if (itemsError) {
      console.error("Error deleting pantry items in list:", itemsError)
      throw itemsError
    }

    // Dan verwijderen we de lijst zelf
    const { error } = await supabase.from("pantry_lists").delete().eq("id", id)

    if (error) {
      console.error("Error deleting pantry list:", error)
      throw error
    }

    return true
  } catch (err) {
    console.error("Unexpected error deleting pantry list:", err)
    return false
  }
}

// Aangepaste pantry item functies
// Verbeter de getPantryItemsByList functie om beter met fouten om te gaan
// Vervang de bestaande functie met deze verbeterde versie:

export async function getPantryItemsByList() {
  try {
    console.log("Starting getPantryItemsByList...")

    const { data, error } = await supabase
      .from("pantry_items")
      .select(`
        *,
        pantry_lists (
          id,
          title
        )
      `)
      .order("name")

    if (error) {
      logQueryError("getPantryItemsByList", error)
      return {}
    }

    console.log(`Retrieved ${data?.length || 0} pantry items`)

    // Groepeer items per lijst
    const itemsByList: Record<string, any[]> = {}

    // Zorg ervoor dat we niet crashen als data null is
    if (data) {
      data.forEach((item) => {
        const listId = item.list_id
        if (!itemsByList[listId]) {
          itemsByList[listId] = []
        }
        itemsByList[listId].push(item)
      })
    }

    return itemsByList
  } catch (err) {
    console.error("Unexpected error in getPantryItemsByList:", err)
    // Return een leeg object in plaats van een fout te gooien
    return {}
  }
}

export async function addPantryItem(name: string, listId: string, label: string, quantity = "") {
  try {
    const { data, error } = await supabase
      .from("pantry_items")
      .insert([{ name, list_id: listId, label, quantity, added_to_list: false }])
      .select()

    if (error) {
      console.error("Error adding pantry item:", error)
      throw error
    }

    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error adding pantry item:", err)
    throw err
  }
}

// Verbeter de updatePantryItem functie om de checked status correct te verwerken
export async function updatePantryItem(
  id: string | number,
  updates: {
    name?: string
    label?: string
    quantity?: string
    added_to_list?: boolean
    list_id?: string
    checked?: boolean
    checked_at?: string | null
  },
) {
  try {
    console.log(`Updating pantry item ${id} with:`, updates)

    // Zorg ervoor dat de checked kolom bestaat
    await ensureCheckedColumnExists()

    // Make sure we're not sending undefined values
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, value]) => value !== undefined))

    // Voer de update uit
    const { data, error } = await supabase.from("pantry_items").update(cleanUpdates).eq("id", id).select()

    if (error) {
      console.error("Error updating pantry item:", error)
      throw error
    }

    console.log(`Successfully updated pantry item ${id}:`, data?.[0])
    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error updating pantry item:", err)
    throw err
  }
}

// Function to add a pantry item to the shopping list
export async function addPantryItemToShoppingList(id: string) {
  try {
    const { data, error } = await supabase.from("pantry_items").update({ added_to_list: true }).eq("id", id).select()

    if (error) {
      console.error("Error adding pantry item to shopping list:", error)
      throw error
    }

    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error adding pantry item to shopping list:", err)
    throw err
  }
}

// Wijzig de removePantryItemFromShoppingList functie om checked status te behouden
export async function removePantryItemFromShoppingList(id: string) {
  try {
    // Haal eerst het huidige item op
    const { data: item, error: fetchError } = await supabase
      .from("pantry_items")
      .select("quantity, checked, checked_at")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching pantry item:", fetchError)
      throw fetchError
    }

    // Extraheer de basis hoeveelheid zonder het aantal
    let baseQuantity = item.quantity || ""
    const countMatch = baseQuantity.match(/^(\d+)x\s*(.*)$/)
    if (countMatch) {
      baseQuantity = countMatch[2]
    }

    const { data, error } = await supabase
      .from("pantry_items")
      .update({
        added_to_list: false,
        quantity: baseQuantity,
        // Behoud de checked status en checked_at
        checked: item.checked,
        checked_at: item.checked_at,
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error resetting pantry item count:", error)
      throw error
    }

    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error resetting pantry item count:", err)
    throw err
  }
}

// Initialiseer pantry lijsten tabel
export async function initializePantryListsTable() {
  try {
    // Controleer of de pantry_lists tabel al gegevens bevat
    const { count, error: countError } = await supabase.from("pantry_lists").select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error checking pantry_lists table:", countError)

      // Probeer de tabel aan te maken als deze niet bestaat
      try {
        // Maak een standaard lijst aan
        const { data, error } = await supabase
          .from("pantry_lists")
          .insert([{ title: "Mijn voorraad", position: 1 }])
          .select()

        if (error) {
          console.error("Error creating default pantry list:", error)
          return false
        }

        console.log("Created default pantry list:", data)
        return true
      } catch (err) {
        console.error("Error initializing pantry_lists table:", err)
        return false
      }
    }

    // Als er al lijsten zijn, hoeven we niets te doen
    if (count && count > 0) {
      console.log("Pantry_lists table already contains data")
      return true
    }

    // Maak een standaard lijst aan
    const { error } = await supabase.from("pantry_lists").insert([{ title: "Mijn voorraad", position: 1 }])

    if (error) {
      console.error("Error initializing pantry_lists table:", error)
      return false
    }

    console.log("Pantry_lists table initialized with default list")
    return true
  } catch (err) {
    console.error("Unexpected error initializing pantry_lists table:", err)
    return false
  }
}

// Migreer bestaande pantry items naar de nieuwe structuur
export async function migratePantryItems() {
  try {
    // Controleer of er al een standaard lijst is
    const { data: lists, error: listsError } = await supabase.from("pantry_lists").select("*").limit(1)

    if (listsError || !lists || lists.length === 0) {
      console.error("No pantry lists found for migration")
      return false
    }

    const defaultListId = lists[0].id

    // Controleer of er pantry items zijn zonder list_id
    const { data: items, error: itemsError } = await supabase.from("pantry_items").select("*").is("list_id", null)

    if (itemsError) {
      console.error("Error checking pantry items for migration:", itemsError)
      return false
    }

    if (!items || items.length === 0) {
      console.log("No pantry items need migration")
      return true
    }

    // Update alle items zonder list_id naar de standaard lijst
    for (const item of items) {
      // Zorg ervoor dat quantity een string is
      const quantity = item.count ? item.count.toString() : ""

      const { error: updateError } = await supabase
        .from("pantry_items")
        .update({ list_id: defaultListId, quantity: quantity })
        .eq("id", item.id)

      if (updateError) {
        console.error(`Error migrating pantry item ${item.id}:`, updateError)
      }
    }

    console.log(`Successfully migrated ${items.length} pantry items`)
    return true
  } catch (err) {
    console.error("Unexpected error during pantry items migration:", err)
    return false
  }
}

// Voeg deze nieuwe functies toe na de bestaande pantry functies

// Vervang de incrementPantryItemCount functie met deze verbeterde versie
export async function incrementPantryItemCount(id: string) {
  try {
    // Haal eerst het huidige item op
    const { data: item, error: fetchError } = await supabase
      .from("pantry_items")
      .select("added_to_list, quantity")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching pantry item:", fetchError)
      throw fetchError
    }

    // Bereken de nieuwe waarden
    let currentCount = 0
    let baseQuantity = item.quantity || ""

    // Probeer het huidige aantal te extraheren uit de quantity string
    const countMatch = baseQuantity.match(/^(\d+)x\s*(.*)$/)
    if (countMatch) {
      currentCount = Number.parseInt(countMatch[1], 10)
      baseQuantity = countMatch[2]
    }

    const newCount = currentCount + 1

    // Als er geen baseQuantity is, gebruik dan alleen het aantal
    const newQuantity = baseQuantity.trim() ? `${newCount}x ${baseQuantity}` : `${newCount}x`

    console.log(`Incrementing count from ${currentCount} to ${newCount}, new quantity: ${newQuantity}`)

    // Update het item
    const { data, error } = await supabase
      .from("pantry_items")
      .update({
        added_to_list: true,
        quantity: newQuantity,
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error incrementing pantry item count:", error)
      throw error
    }

    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error incrementing pantry item count:", err)
    throw err
  }
}

// Vervang ook de decrementPantryItemCount functie met deze verbeterde versie
export async function decrementPantryItemCount(id: string) {
  try {
    // Haal eerst het huidige item op
    const { data: item, error: fetchError } = await supabase
      .from("pantry_items")
      .select("added_to_list, quantity")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching pantry item:", fetchError)
      throw fetchError
    }

    // Bereken de nieuwe waarden
    let currentCount = 0
    let baseQuantity = item.quantity || ""

    // Probeer het huidige aantal te extraheren uit de quantity string
    const countMatch = baseQuantity.match(/^(\d+)x\s*(.*)$/)
    if (countMatch) {
      currentCount = Number.parseInt(countMatch[1], 10)
      baseQuantity = countMatch[2]
    }

    // Als er geen match is maar het item is wel op de lijst, dan is de count 1
    if (!countMatch && item.added_to_list) {
      currentCount = 1
    }

    const newCount = Math.max(0, currentCount - 1)
    const shouldRemoveFromList = newCount === 0

    // Als er geen baseQuantity is, gebruik dan alleen het aantal
    // Als newCount 0 is, verwijder het aantal volledig
    let newQuantity = baseQuantity.trim()
    if (newCount > 0) {
      newQuantity = baseQuantity.trim() ? `${newCount}x ${baseQuantity}` : `${newCount}x`
    }

    console.log(`Decrementing count from ${currentCount} to ${newCount}, new quantity: ${newQuantity}`)

    // Update het item
    const { data, error } = await supabase
      .from("pantry_items")
      .update({
        added_to_list: !shouldRemoveFromList,
        quantity: newQuantity,
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error decrementing pantry item count:", error)
      throw error
    }

    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error decrementing pantry item count:", err)
    throw err
  }
}

// Functie om het aantal van een pantry item op de boodschappenlijst te resetten
export async function resetPantryItemCount(id: string) {
  try {
    // Haal eerst het huidige item op
    const { data: item, error: fetchError } = await supabase
      .from("pantry_items")
      .select("quantity")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching pantry item:", fetchError)
      throw fetchError
    }

    // Extraheer de basis hoeveelheid zonder het aantal
    let baseQuantity = item.quantity || ""
    const countMatch = baseQuantity.match(/^(\d+)x\s*(.*)$/)
    if (countMatch) {
      baseQuantity = countMatch[2]
    }

    const { data, error } = await supabase
      .from("pantry_items")
      .update({
        added_to_list: false,
        quantity: baseQuantity,
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("Error resetting pantry item count:", error)
      throw error
    }

    return data?.[0] || null
  } catch (err) {
    console.error("Unexpected error resetting pantry item count:", err)
    throw err
  }
}

// Functie om afgevinkte items ouder dan 24 uur te verwijderen
export async function cleanupOldCheckedItems() {
  try {
    console.log("Starting cleanup of old checked items...")

    // Bereken de datum van 24 uur geleden
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)
    const oneDayAgoISO = oneDayAgo.toISOString()

    // Controleer eerst of de pantry_items tabel de checked kolom heeft
    try {
      // Probeer een query uit te voeren die de checked kolom gebruikt
      const { count, error } = await supabase
        .from("pantry_items")
        .select("id", { count: "exact", head: true })
        .eq("checked", true)
        .limit(1)

      // Als er geen error is, dan bestaat de kolom en kunnen we doorgaan
      if (!error) {
        // Verwijder afgevinkte pantry items die ouder zijn dan 24 uur
        const { data: pantryItems, error: pantryError } = await supabase
          .from("pantry_items")
          .update({ checked: false, checked_at: null })
          .lt("checked_at", oneDayAgoISO)
          .eq("checked", true)
          .select()

        if (pantryError) {
          console.error("Error cleaning up old checked pantry items:", pantryError)
        } else {
          console.log(`Cleaned up ${pantryItems?.length || 0} old checked pantry items`)
        }
      } else {
        console.log("The 'checked' column doesn't exist in pantry_items table, skipping cleanup")
      }
    } catch (err) {
      console.log("Error checking pantry_items table, skipping cleanup:", err)
    }

    // Controleer of de ingredients tabel de checked kolom heeft
    try {
      // Probeer een query uit te voeren die de checked kolom gebruikt
      const { count, error } = await supabase
        .from("ingredients")
        .select("id", { count: "exact", head: true })
        .eq("checked", true)
        .limit(1)

      // Als er geen error is, dan bestaat de kolom en kunnen we doorgaan
      if (!error) {
        // Verwijder afgevinkte ingredients die ouder zijn dan 24 uur
        const { data: ingredients, error: ingredientsError } = await supabase
          .from("ingredients")
          .update({ checked: false, checked_at: null })
          .lt("checked_at", oneDayAgoISO)
          .eq("checked", true)
          .select()

        if (ingredientsError) {
          console.error("Error cleaning up old checked ingredients:", ingredientsError)
        } else {
          console.log(`Cleaned up ${ingredients?.length || 0} old checked ingredients`)
        }
      } else {
        console.log("The 'checked' column doesn't exist in ingredients table, skipping cleanup")
      }
    } catch (err) {
      console.log("Error checking ingredients table, skipping cleanup:", err)
    }

    // Verwijder afgevinkte shopping_list_items die ouder zijn dan 24 uur
    try {
      // First check if the shopping_list_items table exists without using the checked column
      const { error: tableCheckError } = await supabase.from("shopping_list_items").select("id").limit(1).single()

      if (tableCheckError) {
        // Table doesn't exist or can't be accessed
        console.log("Shopping list items table might not exist, skipping cleanup")
        return true
      }

      // Now check if the checked column exists
      try {
        // Try a simple query that uses the checked column
        const { data: checkColumnTest, error: columnCheckError } = await supabase
          .from("shopping_list_items")
          .select("id")
          .eq("checked", true)
          .limit(1)

        if (columnCheckError) {
          console.log("The 'checked' column doesn't exist in shopping_list_items table, skipping cleanup")
          return true
        }

        // If we get here, the table and column exist, so we can proceed with the cleanup
        const { data: shoppingItems, error: shoppingError } = await supabase
          .from("shopping_list_items")
          .update({ checked: false, checked_at: null })
          .lt("checked_at", oneDayAgoISO)
          .eq("checked", true)
          .select()

        if (shoppingError) {
          console.error("Error cleaning up old checked shopping items:", shoppingError)
        } else {
          console.log(`Cleaned up ${shoppingItems?.length || 0} old checked shopping items`)
        }
      } catch (columnErr) {
        console.log("Error checking for 'checked' column in shopping_list_items:", columnErr)
      }
    } catch (err) {
      console.log("Error accessing shopping_list_items table:", err)
    }

    return true
  } catch (err) {
    console.error("Unexpected error during old checked items cleanup:", err)
    return false
  }
}

// Voeg deze functie toe aan het einde van het bestand
export async function updateShoppingItemPosition(id: string, position: number) {
  try {
    console.log(`Updating position for item ${id} to ${position}`)

    // Probeer eerst de ingredients tabel
    try {
      const { data, error } = await supabase.from("ingredients").update({ position }).eq("id", id).select()

      if (!error && data && data.length > 0) {
        console.log("Updated position in ingredients table")
        return data[0]
      }
    } catch (err) {
      console.log("Item not found in ingredients table, trying pantry_items")
    }

    // Als dat niet lukt, probeer de pantry_items tabel
    try {
      const { data, error } = await supabase.from("pantry_items").update({ position }).eq("id", id).select()

      if (!error && data && data.length > 0) {
        console.log("Updated position in pantry_items table")
        return data[0]
      }
    } catch (err) {
      console.log("Item not found in pantry_items table")
    }

    // Als beide niet lukken, probeer de shopping_list_items tabel als die bestaat
    try {
      const { data, error } = await supabase.from("shopping_list_items").update({ position }).eq("id", id).select()

      if (!error && data && data.length > 0) {
        console.log("Updated position in shopping_list_items table")
        return data[0]
      }
    } catch (err) {
      console.log("Item not found in shopping_list_items table or table doesn't exist")
    }

    console.log("Could not update position for item", id)
    return null
  } catch (err) {
    console.error("Unexpected error updating item position:", err)
    return null
  }
}

// Voeg deze functie toe aan het einde van het bestand
export async function updatePantryListPosition(listId: string, position: number) {
  try {
    const { error } = await supabase.from("pantry_lists").update({ position }).eq("id", listId)

    if (error) {
      console.error("Error updating pantry list position:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in updatePantryListPosition:", error)
    throw error
  }
}
