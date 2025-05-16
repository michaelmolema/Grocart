"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { GripVertical } from "lucide-react"
import { getRecipesSorted, updateRecipePosition } from "@/lib/supabase"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"

interface RecipeListProps {
  onError?: (message: string) => void
  viewMode?: "list" | "grid"
  sortMode?: "title" | "color"
}

// Beschikbare kleuren voor receptkaarten
export const RECIPE_COLORS = [
  { id: "", name: "Standaard", value: "" },
  { id: "blue", name: "Blauw", value: "border-blue-500" },
  { id: "green", name: "Groen", value: "border-green-500" },
  { id: "red", name: "Rood", value: "border-red-500" },
  { id: "purple", name: "Paars", value: "border-purple-500" },
  { id: "yellow", name: "Geel", value: "border-yellow-500" },
  { id: "orange", name: "Oranje", value: "border-orange-500" },
  { id: "pink", name: "Roze", value: "border-pink-500" },
]

// Sorteerbaar recept component
function SortableRecipe({ recipe, viewMode }: { recipe: any; viewMode?: "list" | "grid" }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: recipe.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Functie om de juiste border class te krijgen op basis van de kleur
  const getBorderClass = (color: string) => {
    const colorObj = RECIPE_COLORS.find((c) => c.id === color)
    return colorObj ? colorObj.value : ""
  }

  if (viewMode === "grid") {
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <Card className={`h-full hover:shadow-md transition-shadow border-2 ${getBorderClass(recipe.color)}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <Link href={`/recepten/${recipe.id}`} className="flex-grow">
                <h3 className="text-lg font-medium">{recipe.title}</h3>
              </Link>
              <div className="cursor-grab touch-manipulation" {...attributes} {...listeners}>
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            {recipe.description && <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <Card className={`h-full hover:shadow-md transition-shadow border-2 ${getBorderClass(recipe.color)}`}>
        <CardContent className="flex items-center p-4">
          <div className="mr-2 cursor-grab touch-manipulation" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          <Link href={`/recepten/${recipe.id}`} className="flex-grow">
            <h3 className="text-lg font-medium">{recipe.title}</h3>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RecipeList({ onError, viewMode = "list", sortMode = "title" }: RecipeListProps) {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Sensors voor drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimale afstand voordat drag begint
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Laad recepten bij het laden van de component of wanneer sortMode verandert
  useEffect(() => {
    console.log("RecipeList component geladen of sortMode/viewMode veranderd")
    loadRecipes(sortMode)
  }, [onError, sortMode, viewMode])

  // Laad recepten met de opgegeven sortering
  const loadRecipes = async (sort: string) => {
    try {
      setLoading(true)
      console.log(`Recepten laden met sortering: ${sort}`)

      // Haal altijd de recepten op met hun handmatige positie
      const data = await getRecipesSorted("position")
      console.log("Recepten geladen:", data)

      // Sorteer de recepten op basis van de geselecteerde sortering
      const sortedData = [...data]
      if (sort === "title") {
        sortedData.sort((a, b) => a.title.localeCompare(b.title))
      } else if (sort === "color") {
        // Sorteer op kleur (licht naar donker)
        const colorOrder = ["", "yellow", "orange", "pink", "green", "blue", "purple", "red"]
        sortedData.sort((a, b) => {
          const aIndex = colorOrder.indexOf(a.color || "")
          const bIndex = colorOrder.indexOf(b.color || "")
          return aIndex - bIndex
        })
      }

      setRecipes(sortedData)
    } catch (err) {
      console.error("Error loading recipes:", err)
      const errorMessage = "Er is een fout opgetreden bij het laden van de recepten."
      setError(errorMessage)
      if (onError) onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Verwerk drag & drop gebeurtenissen
  const handleDragEnd = async (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setIsSaving(true)

      try {
        // Vind de indices van de gesleepte en doelrecepten
        const oldIndex = recipes.findIndex((recipe) => recipe.id === active.id)
        const newIndex = recipes.findIndex((recipe) => recipe.id === over.id)

        // Maak een kopie van de receptenlijst
        const newRecipes = [...recipes]

        // Verwijder het gesleepte recept uit de lijst
        const [movedRecipe] = newRecipes.splice(oldIndex, 1)

        // Voeg het gesleepte recept toe op de nieuwe positie
        newRecipes.splice(newIndex, 0, movedRecipe)

        // Update de state
        setRecipes(newRecipes)

        // Update de posities in de database
        // We geven elk recept een positie op basis van zijn index in de lijst
        for (let i = 0; i < newRecipes.length; i++) {
          await updateRecipePosition(newRecipes[i].id, i + 1)
        }
      } catch (err) {
        console.error("Error updating recipe positions:", err)
        const errorMessage = "Er is een fout opgetreden bij het bijwerken van de receptposities."
        setError(errorMessage)
        if (onError) onError(errorMessage)

        // Laad de recepten opnieuw om de oorspronkelijke volgorde te herstellen
        loadRecipes(sortMode)
      } finally {
        setIsSaving(false)
      }
    }
  }

  if (loading) {
    return <div className="text-center py-10">Loading recipes...</div>
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>
  }

  return (
    <div>
      {isSaving && <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded-md text-center">Saving order...</div>}

      {recipes.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No recipes added yet</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={recipes.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map((recipe) => (
                  <SortableRecipe key={recipe.id} recipe={recipe} viewMode={viewMode} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                {recipes.map((recipe) => (
                  <SortableRecipe key={recipe.id} recipe={recipe} viewMode={viewMode} />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
