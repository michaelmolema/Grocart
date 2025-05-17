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
}

interface Label {
  id: string
  name: string
  color: string
  label_type: string
}

export default function NewRecipePage() {
  const [recipeText, setRecipeText] = useState("")
  const [parsedRecipe, setParsedRecipe] = useState<boolean>(false)
  const [title, setTitle] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [instructions, setInstructions] = useState("")
  const [color, setColor] = useState("#4285F4") // Default to Google blue
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [labels, setLabels] = useState<Label[]>([])

  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Fetch labels when component mounts
    async function fetchLabels() {
      const { data, error } = await supabase.from("labels").select("*").order("position")
      if (error) {
        console.error("Error fetching labels:", error)
        return
      }
      setLabels(data || [])
    }

    fetchLabels()
  }, [supabase])

  const processText = () => {
    setIsProcessing(true)

    try {
      // Split the text by lines
      const lines = recipeText.split("\n").map((line) => line.trim())

      // First line is the title
      const title = lines[0]

      // Find the ingredients section
      const ingredientsIndex = lines.findIndex(
        (line) => line.toLowerCase() === "ingredients" || line.toLowerCase() === "ingredients:",
      )

      // Find the instructions section
      const instructionsIndex = lines.findIndex(
        (line) => line.toLowerCase() === "instructions" || line.toLowerCase() === "instructions:",
      )

      if (ingredientsIndex === -1 || instructionsIndex === -1 || ingredientsIndex >= instructionsIndex) {
        alert("Could not parse the recipe format. Please make sure it follows the required format.")
        setIsProcessing(false)
        return
      }

      // Extract ingredients (skip the "ingredients" line)
      const ingredientsList = lines
        .slice(ingredientsIndex + 1, instructionsIndex)
        .filter((line) => line.trim() !== "")
        .map((line, index) => ({
          id: `temp-${index}`,
          name: line.trim(),
          label: null,
          buyText: "",
          position: index,
        }))

      // Extract instructions (skip the "instructions" line)
      const instructionsList = lines.slice(instructionsIndex + 1).filter((line) => line.trim() !== "")

      // Set the form fields
      setTitle(title)
      setIngredients(ingredientsList)
      setInstructions(instructionsList.join("\n"))
      setParsedRecipe(true)
    } catch (error) {
      console.error("Error parsing recipe:", error)
      alert("An error occurred while parsing the recipe.")
    }

    setIsProcessing(false)
  }

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
      // Insert the recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .insert([
          {
            title,
            instructions,
            color,
            position: 999, // Default high position, will be sorted later
          },
        ])
        .select()

      if (recipeError) {
        throw recipeError
      }

      if (!recipeData || recipeData.length === 0) {
        throw new Error("No recipe data returned")
      }

      const recipeId = recipeData[0].id

      // Insert ingredients
      if (ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map((ing, index) => ({
          recipe_id: recipeId,
          name: ing.name.trim(),
          label: ing.label,
          quantity: ing.buyText.trim() || null,
          position: index,
        }))

        const { error: ingredientsError } = await supabase.from("ingredients").insert(ingredientsToInsert)

        if (ingredientsError) {
          throw ingredientsError
        }
      }

      // Redirect to the recipe page
      router.push(`/recipes/${recipeId}`)
    } catch (error) {
      console.error("Error saving recipe:", error)
      alert("An error occurred while saving the recipe.")
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/recipes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Utensils className="h-6 w-6 text-blue-500" />
        <h1 className="text-2xl font-bold">New Recipe</h1>
      </div>

      {!parsedRecipe ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2">Paste your recipe here</p>
            <Textarea value={recipeText} onChange={(e) => setRecipeText(e.target.value)} className="min-h-[300px]" />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={processText}
              disabled={!recipeText.trim() || isProcessing}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Process text
            </Button>
          </div>
        </div>
      ) : (
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
                                  <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                  ></span>
                                  {label.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          value={ingredient.buyText}
                          onChange={(e) => handleIngredientChange(ingredient.id, "buyText", e.target.value)}
                          placeholder="Optional override text"
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
            <Button variant="outline" onClick={() => setParsedRecipe(false)}>
              Back
            </Button>
            <Button onClick={saveRecipe} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600">
              Save Recipe
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
