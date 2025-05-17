"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowLeft, Utensils, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorSelector } from "@/components/color-selector"

interface Ingredient {
  id: string
  name: string
  label: string | null
  buyText: string
  position: number
  recipe_id?: string
  shopping_text?: string
}

interface Label {
  id: string
  name: string
  color: string
  label_type: string
}

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [instructions, setInstructions] = useState("")
  const [color, setColor] = useState("#4285F4") // Default to Google blue
  const [isSaving, setIsSaving] = useState(false)
  const [labels, setLabels] = useState<Label[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)

      // Fetch recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", params.id)
        .single()

      if (recipeError) {
        console.error("Error fetching recipe:", recipeError)
        return
      }

      setTitle(recipeData.title)
      setInstructions(recipeData.instructions)
      setColor(recipeData.color)

      // Fetch ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("recipe_id", params.id)
        .order("position")

      if (ingredientsError) {
        console.error("Error fetching ingredients:", ingredientsError)
        return
      }

      // Transform ingredients to match our local state format
      const transformedIngredients = ingredientsData.map((ing) => ({
        id: ing.id,
        name: ing.name,
        label: ing.label,
        buyText: ing.quantity || "",
        position: ing.position,
        recipe_id: ing.recipe_id,
        shopping_text: ing.shopping_text || "",
      }))

      setIngredients(transformedIngredients)

      // Fetch labels
      const { data: labelsData, error: labelsError } = await supabase.from("labels").select("*").order("position")

      if (labelsError) {
        console.error("Error fetching labels:", labelsError)
        return
      }

      setLabels(labelsData || [])
      setIsLoading(false)
    }

    fetchData()
  }, [supabase, params.id])

  const handleIngredientChange = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing) =>
        ing.id === id ? { ...ing, [field]: field === "label" && value === "default" ? null : value } : ing,
      ),
    )
  }

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: `temp-${Date.now()}`,
      name: "",
      label: null,
      buyText: "",
      position: ingredients.length,
      shopping_text: "",
    }
    setIngredients([...ingredients, newIngredient])
  }

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id))
  }

  const saveRecipe = async () => {
    if (!title.trim()) {
      alert("Please enter a title for the recipe.")
      return
    }

    setIsSaving(true)

    try {
      // Update the recipe
      const { error: recipeError } = await supabase
        .from("recipes")
        .update({
          title,
          instructions,
          color,
        })
        .eq("id", params.id)

      if (recipeError) {
        throw recipeError
      }

      // Handle ingredients
      // 1. Identify existing ingredients to update
      const existingIngredients = ingredients.filter((ing) => ing.recipe_id === params.id)

      // 2. Identify new ingredients to insert
      const newIngredients = ingredients.filter((ing) => !ing.recipe_id)

      // 3. Identify ingredients to delete (those in DB but not in our current state)
      const { data: currentDbIngredients } = await supabase.from("ingredients").select("id").eq("recipe_id", params.id)

      const currentIds = new Set(ingredients.map((ing) => ing.id))
      const idsToDelete = currentDbIngredients?.filter((ing) => !currentIds.has(ing.id)).map((ing) => ing.id) || []

      // 4. Update existing ingredients
      for (const ing of existingIngredients) {
        await supabase
          .from("ingredients")
          .update({
            name: ing.name.trim(),
            label: ing.label,
            quantity: ing.buyText.trim() || null,
            position: ing.position,
            shopping_text: ing.shopping_text?.trim() || null,
          })
          .eq("id", ing.id)
      }

      // 5. Insert new ingredients
      if (newIngredients.length > 0) {
        const ingredientsToInsert = newIngredients.map((ing, index) => ({
          recipe_id: params.id,
          name: ing.name.trim(),
          label: ing.label,
          quantity: ing.buyText.trim() || null,
          position: existingIngredients.length + index,
          shopping_text: ing.shopping_text?.trim() || null,
        }))

        const { error: insertError } = await supabase.from("ingredients").insert(ingredientsToInsert)

        if (insertError) {
          throw insertError
        }
      }

      // 6. Delete removed ingredients
      if (idsToDelete.length > 0) {
        await supabase.from("ingredients").delete().in("id", idsToDelete)
      }

      // Redirect to the recipe page
      router.push(`/recipes/${params.id}`)
    } catch (error) {
      console.error("Error saving recipe:", error)
      alert("An error occurred while saving the recipe.")
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">Loading recipe...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/recipes/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Utensils className="h-6 w-6 text-blue-500" />
        <h1 className="text-2xl font-bold">Edit Recipe</h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="block font-medium">
              Title
            </label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm">Recipe Color</label>
            <ColorSelector selectedColor={color} onColorChange={setColor} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block font-medium">Ingredients</label>
          </div>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium">Ingredient</th>
                  <th className="text-left p-2 font-medium">Label</th>
                  <th className="text-left p-2 font-medium">Shopping List Text</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ingredient) => (
                  <tr key={ingredient.id} className="border-t">
                    <td className="p-2">
                      <Input
                        value={ingredient.name}
                        onChange={(e) => handleIngredientChange(ingredient.id, "name", e.target.value)}
                        className="w-full"
                        placeholder="Quantity + ingredient (e.g. 200g flour)"
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={ingredient.label || "default"}
                        onValueChange={(value) => handleIngredientChange(ingredient.id, "label", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">No label</SelectItem>
                          {labels.map((label) => (
                            <SelectItem key={label.id} value={label.id}>
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }}></span>
                                {label.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        value={ingredient.shopping_text || ""}
                        onChange={(e) => handleIngredientChange(ingredient.id, "shopping_text", e.target.value)}
                        placeholder="Optional override text for shopping list"
                        className="w-full"
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(ingredient.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {ingredients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No ingredients added. Click the plus button below to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center mt-4">
            <Button
              size="icon"
              className="rounded-full h-10 w-10 bg-blue-500 hover:bg-blue-600"
              onClick={addIngredient}
            >
              <Plus className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="instructions" className="block font-medium">
            Instructions
          </label>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="min-h-[200px]"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href={`/recipes/${params.id}`}>Cancel</Link>
          </Button>
          <Button onClick={saveRecipe} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
            Save Recipe
          </Button>
        </div>
      </div>
    </div>
  )
}
