"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle, Utensils } from "lucide-react"
import RecipeList from "@/components/recipe-list"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function ReceptenPage() {
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [sortMode, setSortMode] = useState<"title" | "color">("title")
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)

  // Voeg een effect toe om te controleren of de pagina correct wordt geladen
  useEffect(() => {
    console.log("ReceptenPage component geladen")
  }, [])

  // Voeg een error boundary toe
  if (error) {
    return (
      <div className="py-6 text-red-500">
        <h1 className="text-2xl font-bold mb-4">An error has occurred</h1>
        <p>{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Utensils className="h-6 w-6 mr-2 text-[#4285F4]" />
          <h1 className="text-2xl font-bold text-gray-800">Recipes</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsManageDialogOpen(true)}>
            Manage Recipes
          </Button>

          {isManageDialogOpen && (
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Manage Recipes</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Display Mode</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={viewMode === "list" ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setViewMode("list")}
                      >
                        <span className="flex items-center">
                          <span
                            className={`mr-2 h-4 w-4 rounded-full ${viewMode === "list" ? "bg-primary" : "border border-gray-400"}`}
                          ></span>
                          List View
                        </span>
                      </Button>
                      <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setViewMode("grid")}
                      >
                        <span className="flex items-center">
                          <span
                            className={`mr-2 h-4 w-4 rounded-full ${viewMode === "grid" ? "bg-primary" : "border border-gray-400"}`}
                          ></span>
                          Grid View
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">Sort Mode</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={sortMode === "title" ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSortMode("title")}
                      >
                        <span className="flex items-center">
                          <span
                            className={`mr-2 h-4 w-4 rounded-full ${sortMode === "title" ? "bg-primary" : "border border-gray-400"}`}
                          ></span>
                          Name (A-Z)
                        </span>
                      </Button>
                      <Button
                        variant={sortMode === "color" ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSortMode("color")}
                      >
                        <span className="flex items-center">
                          <span
                            className={`mr-2 h-4 w-4 rounded-full ${sortMode === "color" ? "bg-primary" : "border border-gray-400"}`}
                          ></span>
                          Color
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsManageDialogOpen(false)}>Apply</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Link href="/recepten/nieuw">
            <Button className="bg-[#4285F4] hover:bg-[#3367d6]">
              <PlusCircle className="mr-2 h-4 w-4" />
              Recipe
            </Button>
          </Link>
        </div>
      </div>

      <RecipeList onError={(msg) => setError(msg)} viewMode={viewMode} sortMode={sortMode} />
    </div>
  )
}
