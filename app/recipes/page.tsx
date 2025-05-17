"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ChefHat, Plus, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"

interface Recipe {
  id: string
  title: string
  instructions: string
  color: string
  position: number
}

function SortableRecipe({ recipe }: { recipe: Recipe }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: recipe.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderColor: recipe.color,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center p-4 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    >
      <div className="flex items-center gap-2 flex-1">
        <button className="cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <Link href={`/recipes/${recipe.id}`} className="flex-1">
          <span className="font-medium">{recipe.title}</span>
        </Link>
      </div>
    </div>
  )
}

function GridRecipe({ recipe }: { recipe: Recipe }) {
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <div
        className="p-4 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors h-32 flex items-center justify-center"
        style={{ borderColor: recipe.color }}
      >
        <span className="font-medium text-center">{recipe.title}</span>
      </div>
    </Link>
  )
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [showManageModal, setShowManageModal] = useState(false)
  const [sortBy, setSortBy] = useState("position")
  const [viewMode, setViewMode] = useState("list")
  const supabase = createClientComponentClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    fetchRecipes()
  }, [])

  async function fetchRecipes() {
    const { data, error } = await supabase.from("recipes").select("*").order("position")

    if (error) {
      console.error("Error fetching recipes:", error)
      return
    }

    setRecipes(data || [])
  }

  useEffect(() => {
    // Sort recipes when sortBy changes
    if (sortBy === "name") {
      setRecipes((prev) => [...prev].sort((a, b) => a.title.localeCompare(b.title)))
    } else if (sortBy === "color") {
      setRecipes((prev) => {
        // Convert color to HSL to sort by lightness
        return [...prev].sort((a, b) => {
          // Simple comparison for demo purposes
          // In a real app, you'd convert hex to HSL and compare lightness
          return a.color.localeCompare(b.color)
        })
      })
    }
  }, [sortBy])

  async function updateRecipePositions(updatedRecipes: Recipe[]) {
    // In a real implementation, you would update the positions in the database
    // This is a simplified version
    for (let i = 0; i < updatedRecipes.length; i++) {
      const recipe = updatedRecipes[i]
      if (recipe.position !== i) {
        await supabase.from("recipes").update({ position: i }).eq("id", recipe.id)
      }
    }
  }

  function handleDragEnd(event: any) {
    const { active, over } = event

    if (active.id !== over.id) {
      setRecipes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)

        // Update positions in the database
        updateRecipePositions(newItems)

        return newItems
      })
    }
  }

  function applySettings() {
    // Apply the settings and close the modal
    setShowManageModal(false)
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Recipes</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowManageModal(true)}>
            Manage Recipes
          </Button>
          <Button className="bg-blue-500 hover:bg-blue-600" asChild>
            <Link href="/recipes/new">
              <Plus className="mr-2 h-4 w-4" />
              Recipe
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {viewMode === "list" ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={recipes.map((recipe) => recipe.id)} strategy={verticalListSortingStrategy}>
              {recipes.map((recipe) => (
                <SortableRecipe key={recipe.id} recipe={recipe} />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recipes.map((recipe) => (
              <GridRecipe key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {recipes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No recipes found. Add your first recipe to get started.
          </div>
        )}
      </div>

      {showManageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Manage Recipes</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Sort by</h3>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === "name" ? "default" : "outline"}
                    className={sortBy === "name" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    onClick={() => setSortBy("name")}
                  >
                    Name (A-Z)
                  </Button>
                  <Button
                    variant={sortBy === "color" ? "default" : "outline"}
                    className={sortBy === "color" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    onClick={() => setSortBy("color")}
                  >
                    Color (light-dark)
                  </Button>
                  <Button
                    variant={sortBy === "position" ? "default" : "outline"}
                    className={sortBy === "position" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    onClick={() => setSortBy("position")}
                  >
                    Custom
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">View</h3>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    className={viewMode === "list" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    onClick={() => setViewMode("list")}
                  >
                    List
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    className={viewMode === "grid" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    onClick={() => setViewMode("grid")}
                  >
                    Grid
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowManageModal(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-500 hover:bg-blue-600" onClick={applySettings}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
