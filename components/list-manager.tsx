"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, X, AlertCircle } from "lucide-react"
import { getPantryLists, addPantryList, updatePantryList, deletePantryList } from "@/lib/supabase"

interface ListItem {
  id: string
  title: string
  position: number
  color?: string
}

interface ListManagerProps {
  isOpen: boolean
  onClose: () => void
}

// Definieer een type voor de lijst kleuren
type ListColors = Record<string, string>

// Definieer een constante voor de localStorage key
const LIST_COLORS_STORAGE_KEY = "pantry-list-colors"

export function ListManager({ isOpen, onClose }: ListManagerProps) {
  const [lists, setLists] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddMode, setIsAddMode] = useState(false)
  const [editingList, setEditingList] = useState<ListItem | null>(null)
  const [newListTitle, setNewListTitle] = useState("")
  const [newListColor, setNewListColor] = useState("gray")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Voeg een state toe om de kleuren bij te houden
  const [listColors, setListColors] = useState<ListColors>({})

  // Beschikbare kleuren voor lijsten
  const AVAILABLE_COLORS = [
    { id: "blue", name: "Blue" },
    { id: "green", name: "Green" },
    { id: "red", name: "Red" },
    { id: "purple", name: "Purple" },
    { id: "yellow", name: "Yellow" },
    { id: "orange", name: "Orange" },
    { id: "pink", name: "Pink" },
    { id: "gray", name: "Gray" },
  ]

  // Functie om kleuren op te slaan in localStorage
  const saveListColors = (colors: ListColors) => {
    try {
      localStorage.setItem(LIST_COLORS_STORAGE_KEY, JSON.stringify(colors))
    } catch (error) {
      console.error("Error saving list colors to localStorage:", error)
    }
  }

  // Functie om kleuren te laden uit localStorage
  const loadListColors = (): ListColors => {
    try {
      const storedColors = localStorage.getItem(LIST_COLORS_STORAGE_KEY)
      return storedColors ? JSON.parse(storedColors) : {}
    } catch (error) {
      console.error("Error loading list colors from localStorage:", error)
      return {}
    }
  }

  // Wijzig de useEffect om de kleuren te initialiseren
  useEffect(() => {
    if (isOpen) {
      loadLists()
    }
  }, [isOpen])

  const loadLists = async () => {
    try {
      setLoading(true)
      setError(null)

      // Laad opgeslagen kleuren uit localStorage
      const savedColors = loadListColors()
      setListColors(savedColors)

      // Haal de lijsten op
      const listsData = await getPantryLists()

      // Voeg kleuren toe aan de lijsten
      const listsWithColors = listsData.map((list) => ({
        ...list,
        color: savedColors[list.id] || "gray",
      }))

      setLists(listsWithColors)
    } catch (err) {
      console.error("Error loading lists:", err)
      setError("Failed to load lists. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Wijzig de handleAddList functie
  const handleAddList = async () => {
    if (!newListTitle.trim()) {
      setError("Please enter a list title")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Voeg de lijst toe (color wordt genegeerd in de database)
      const newList = await addPantryList(newListTitle)
      if (newList) {
        // Sla de kleur op in localStorage
        const updatedColors = { ...listColors, [newList.id]: newListColor }
        setListColors(updatedColors)
        saveListColors(updatedColors)

        // Voeg de kleur toe aan de lijst voor de UI
        const listWithColor = { ...newList, color: newListColor }
        const updatedLists = [...lists, listWithColor]
        setLists(updatedLists)

        setNewListTitle("")
        setNewListColor("gray")
        setIsAddMode(false)
      }
    } catch (err) {
      console.error("Error adding list:", err)
      setError("Failed to add list. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Wijzig de handleUpdateList functie
  const handleUpdateList = async () => {
    if (!editingList) return

    if (!editingList.title.trim()) {
      setError("Please enter a list title")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Update de lijst (color wordt genegeerd in de database)
      const updatedList = await updatePantryList(editingList.id, editingList.title)

      if (updatedList) {
        // Sla de kleur op in localStorage
        const updatedColors = { ...listColors, [editingList.id]: editingList.color || "gray" }
        setListColors(updatedColors)
        saveListColors(updatedColors)

        // Voeg de kleur toe aan de lijst voor de UI
        const listWithColor = { ...updatedList, color: editingList.color }
        const updatedLists = lists.map((list) => (list.id === updatedList.id ? listWithColor : list))
        setLists(updatedLists)

        setEditingList(null)
      }
    } catch (err) {
      console.error("Error updating list:", err)
      setError("Failed to update list. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteList = async (id: string) => {
    try {
      setIsSubmitting(true)
      setDeleteError(null)

      await deletePantryList(id)

      // Verwijder de kleur uit localStorage
      const updatedColors = { ...listColors }
      delete updatedColors[id]
      setListColors(updatedColors)
      saveListColors(updatedColors)

      const updatedLists = lists.filter((list) => list.id !== id)
      setLists(updatedLists)

      setDeleteConfirmId(null)
    } catch (err) {
      console.error("Error deleting list:", err)
      setDeleteError(err instanceof Error ? err.message : "Failed to delete list. It may contain items.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (list: ListItem) => {
    setEditingList(list)
    setIsAddMode(false)
  }

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleColorChange = (color: string) => {
    if (editingList) {
      setEditingList({ ...editingList, color })
    } else {
      setNewListColor(color)
    }
  }

  // Functie om de juiste CSS klasse te genereren voor de lijst border
  const getListBorderClass = (color: string) => {
    switch (color) {
      case "blue":
        return "border-blue-500"
      case "green":
        return "border-green-500"
      case "red":
        return "border-red-500"
      case "purple":
        return "border-purple-500"
      case "yellow":
        return "border-yellow-500"
      case "orange":
        return "border-orange-500"
      case "pink":
        return "border-pink-500"
      default:
        return "border-gray-500"
    }
  }

  const renderColorPicker = (selectedColor: string, onChange: (color: string) => void) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {AVAILABLE_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`w-8 h-8 rounded-full border-2 ${
            selectedColor === color.id ? "ring-2 ring-offset-2 ring-[#4285F4]" : ""
          } bg-${color.id}-500`}
          onClick={() => onChange(color.id)}
          title={color.name}
        />
      ))}
    </div>
  )

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Lists</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">Loading lists...</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Lists</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start mb-4">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {lists.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No lists found. Add your first list.</div>
          ) : (
            <ul className="space-y-2">
              {lists.map((list) => {
                const borderClass = getListBorderClass(list.color || "gray")

                return (
                  <li
                    key={list.id}
                    className={`p-3 border rounded-md ${
                      editingList?.id === list.id ? "border-[#4285F4] bg-blue-50" : `border-l-4 ${borderClass}`
                    }`}
                  >
                    {editingList?.id === list.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`edit-list-${list.id}`} className="text-sm font-medium">
                            List Name
                          </Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingList(null)}
                            className="h-7 w-7 rounded-full"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          id={`edit-list-${list.id}`}
                          value={editingList.title}
                          onChange={(e) => setEditingList({ ...editingList, title: e.target.value })}
                          className="mb-2"
                        />
                        <div>
                          <Label className="text-sm font-medium">Color</Label>
                          {renderColorPicker(editingList.color || "gray", handleColorChange)}
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={handleUpdateList} disabled={isSubmitting} size="sm">
                            {isSubmitting ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full bg-${list.color || "gray"}-500 mr-3`} />
                          <span>{list.title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(list)}
                            className="h-7 w-7 rounded-full"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(list.id)}
                            className="h-7 w-7 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {isAddMode ? (
            <div className="mt-4 p-3 border rounded-md border-[#4285F4] bg-blue-50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-list-name" className="text-sm font-medium">
                    New List Name
                  </Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsAddMode(false)}
                    className="h-7 w-7 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  id="new-list-name"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Enter list name"
                  className="mb-2"
                />
                <div>
                  <Label className="text-sm font-medium">Color</Label>
                  {renderColorPicker(newListColor, handleColorChange)}
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddList} disabled={isSubmitting} size="sm">
                    {isSubmitting ? "Adding..." : "Add List"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsAddMode(true)}
              className="mt-4 w-full bg-[#4285F4] hover:bg-[#3367d6]"
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New List
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="mt-4">
            Close
          </Button>
        </DialogFooter>

        {/* Delete Confirmation Dialog */}
        {deleteConfirmId && (
          <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete List</DialogTitle>
              </DialogHeader>

              <p>Are you sure you want to delete this list? This action cannot be undone.</p>
              <p className="text-amber-600">All items in this list will also be deleted.</p>

              {deleteError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start mt-2">
                  <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteList(deleteConfirmId)} disabled={isSubmitting}>
                  {isSubmitting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
