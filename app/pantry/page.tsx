"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Package, Plus, Trash2, Edit, PlusCircle, MinusCircle, GripVertical } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getPantryLists,
  getPantryItemsByList,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  getLabels,
  incrementPantryItemCount,
  decrementPantryItemCount,
  updateShoppingItemPosition,
  updatePantryListPosition,
} from "@/lib/supabase"
import { DEFAULT_LABELS } from "@/lib/utils"
import { useLabelsStore } from "@/lib/labels-store"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { restrictToVerticalAxis, restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import { ListManager } from "@/components/list-manager"

// Sorteerbaar item component
function SortableItem({
  item,
  onEdit,
  onDelete,
  onIncrement,
  onDecrement,
  updatingItemId,
}: {
  item: any
  onEdit: (item: any) => void
  onDelete: (item: any) => void
  onIncrement: (item: any) => void
  onDecrement: (item: any) => void
  updatingItemId: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Helper functie om het item count te krijgen
  const getItemCount = (item: any): number => {
    if (!item.added_to_list) return 0

    const countMatch = item.quantity?.match(/^(\d+)x\s*/)
    if (countMatch) {
      return Number.parseInt(countMatch[1], 10)
    }

    // Als het item op de lijst staat maar geen expliciete count heeft, toon 1
    return item.added_to_list ? 1 : 0
  }

  const itemCount = getItemCount(item)

  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        willChange: "transform",
        zIndex: transform ? 1 : "auto",
      }}
      className={`py-3 flex items-center justify-between ${
        transform ? "bg-gray-50 shadow-md rounded-md" : ""
      } will-change-transform`}
    >
      <div className="flex items-center">
        <div className="flex items-center mr-2 cursor-grab touch-manipulation" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>
        <span className="font-medium">{item.name}</span>
        {/* Quantity info is removed as requested */}
        {item.label && (
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">{item.labelName || item.label}</span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {/* Shopping list count */}
        <div className="flex items-center space-x-1 mr-2">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => onDecrement(item)}
            disabled={updatingItemId === item.id || itemCount === 0}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>

          <span className="w-6 text-center font-medium">{itemCount}</span>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => onIncrement(item)}
            disabled={updatingItemId === item.id}
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(item)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  )
}

// Voeg deze nieuwe component toe na de SortableItem component
// Sorteerbare tab component
function SortableTab({
  list,
  activeTab,
  itemCount,
  listColor,
  children,
}: {
  list: any
  activeTab: string
  itemCount: number
  listColor: string
  children?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : "auto",
  }

  // Functie om de juiste CSS klasse te genereren voor de tab border
  const getTabBorderClass = (color: string) => {
    switch (color) {
      case "blue":
        return "border-b-2 border-blue-500"
      case "green":
        return "border-b-2 border-green-500"
      case "red":
        return "border-b-2 border-red-500"
      case "purple":
        return "border-b-2 border-purple-500"
      case "yellow":
        return "border-b-2 border-yellow-500"
      case "orange":
        return "border-b-2 border-orange-500"
      case "pink":
        return "border-b-2 border-pink-500"
      default:
        return "border-b-2 border-gray-500"
    }
  }

  const borderClass = activeTab === list.id ? getTabBorderClass(listColor) : ""

  return (
    <TabsTrigger
      ref={setNodeRef}
      style={style}
      value={list.id}
      className={`flex-shrink-0 ${
        activeTab === list.id ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-700 hover:bg-gray-50"
      } ${isDragging ? "shadow-md bg-gray-50" : ""} ${borderClass}`}
    >
      <div className="flex items-center">
        <div className="mr-1.5 cursor-grab touch-manipulation" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <span>{list.title}</span>
        {itemCount !== undefined && (
          <span className="ml-2 text-xs bg-gray-200 rounded-full px-2 py-0.5">{itemCount}</span>
        )}
      </div>
      {children}
    </TabsTrigger>
  )
}

// Definieer een type voor de lijst kleuren
type ListColors = Record<string, string>

// Definieer een constante voor de localStorage key
const LIST_COLORS_STORAGE_KEY = "pantry-list-colors"

export default function PantryPage() {
  const [pantryLists, setPantryLists] = useState<any[]>([])
  const [itemsByList, setItemsByList] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasActiveMeals, setHasActiveMeals] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [activeTab, setActiveTab] = useState<string>("")

  // Dialogs
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false)
  const [isDeleteItemDialogOpen, setIsDeleteItemDialogOpen] = useState(false)
  const [isListManagerOpen, setIsListManagerOpen] = useState(false)

  // New item form
  const [newItemName, setNewItemName] = useState("")
  const [newItemLabel, setNewItemLabel] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState("")
  const [newItemListId, setNewItemListId] = useState("")

  // Edit item
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [deletingItem, setDeletingItem] = useState<any | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)

  // Use the global labels store
  const { labels, updateLabels } = useLabelsStore()

  // Voeg een state toe om de kleuren bij te houden
  const [listColors, setListColors] = useState<ListColors>({})

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

  // Save scroll position when updating items
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Restore scroll position after data is loaded
  useEffect(() => {
    if (!loading && scrollPosition > 0) {
      window.scrollTo(0, scrollPosition)
    }
  }, [loading, scrollPosition])

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

  // Functie om een willekeurige kleur toe te wijzen
  const getRandomColor = (): string => {
    const colors = ["blue", "green", "red", "purple", "yellow", "orange", "pink", "gray"]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Functie om kleuren te initialiseren voor nieuwe lijsten
  const initializeListColors = (lists: any[], existingColors: ListColors): ListColors => {
    const newColors = { ...existingColors }

    lists.forEach((list) => {
      if (!newColors[list.id]) {
        newColors[list.id] = getRandomColor()
      }
    })

    return newColors
  }

  // Vervang de useEffect hook die de initiële data laadt met deze verbeterde versie
  // die beter omgaat met errors en state updates

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      try {
        if (isMounted) setLoading(true)

        // Laad opgeslagen kleuren uit localStorage
        const savedColors = loadListColors()

        // Vereenvoudig de data loading om problemen te identificeren
        console.log("Loading labels...")
        const labelsData = await getLabels()

        if (isMounted) {
          if (labelsData.length > 0) {
            updateLabels(labelsData)
          } else {
            const defaultLabelsWithPosition = DEFAULT_LABELS.map((label, index) => ({
              id: label.id,
              name: label.name,
              color: label.color,
              position: index + 1,
            }))
            updateLabels(defaultLabelsWithPosition)
          }
        }

        console.log("Loading pantry lists...")
        const lists = await getPantryLists()

        if (isMounted) {
          setPantryLists(lists)

          // Initialiseer kleuren voor alle lijsten
          const initializedColors = initializeListColors(lists, savedColors)
          setListColors(initializedColors)
          saveListColors(initializedColors)

          // If there are lists, set the default list for new items and active tab
          if (lists.length > 0) {
            setNewItemListId(lists[0].id)
            setActiveTab(lists[0].id)
          }
        }

        console.log("Loading pantry items...")
        const items = await getPantryItemsByList()

        if (isMounted) {
          // Add label names to items
          const itemsWithLabelNames: Record<string, any[]> = {}
          Object.keys(items).forEach((listId) => {
            itemsWithLabelNames[listId] = items[listId].map((item) => ({
              ...item,
              labelName: labelsData.find((l) => l.id === item.label)?.name || item.label,
            }))
          })

          setItemsByList(itemsWithLabelNames)
        }
      } catch (err) {
        console.error("Error loading initial data:", err)
        if (isMounted) {
          setError("An error occurred while loading the data. Please try refreshing the page.")
          // Set loading to false even if there's an error to prevent infinite loading state
          setLoading(false)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [updateLabels])

  // Voeg een fallback toe voor als het laden te lang duurt
  // Voeg deze code toe vlak voor de return statement met loading check

  useEffect(() => {
    // Als het laden langer dan 10 seconden duurt, toon een foutmelding
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false)
        setError("Loading took too long. There might be a connection issue. Please try refreshing the page.")
      }
    }, 10000)

    return () => clearTimeout(timeoutId)
  }, [loading])

  // Helper function to get the item count from the quantity string
  const getItemCount = (item: any): number => {
    if (!item.added_to_list) return 0

    const countMatch = item.quantity?.match(/^(\d+)x\s*/)
    if (countMatch) {
      return Number.parseInt(countMatch[1], 10)
    }
    return 1 // If the item is on the list but has no count, show 1
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      setError("Please enter an item name")
      return
    }

    if (!newItemLabel) {
      setError("Please select a label")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await addPantryItem(newItemName, newItemListId, newItemLabel, newItemQuantity)

      // Reset form and close dialog
      setNewItemName("")
      setNewItemLabel("")
      setNewItemQuantity("")
      setIsAddItemDialogOpen(false)

      // Reload items
      await loadPantryData()
    } catch (err) {
      console.error("Error adding pantry item:", err)
      setError("An error occurred while adding the item.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return

    if (!editingItem.name.trim()) {
      setError("Please enter an item name")
      return
    }

    if (!editingItem.label) {
      setError("Please select a label")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await updatePantryItem(editingItem.id, {
        name: editingItem.name,
        label: editingItem.label,
        quantity: editingItem.quantity,
        list_id: editingItem.list_id,
      })

      setIsEditItemDialogOpen(false)
      setEditingItem(null)

      // Reload items
      await loadPantryData()
    } catch (err) {
      console.error("Error updating pantry item:", err)
      setError("An error occurred while updating the item.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!deletingItem) return

    try {
      setIsSubmitting(true)
      setError(null)

      await deletePantryItem(deletingItem.id)

      setIsDeleteItemDialogOpen(false)
      setDeletingItem(null)

      // Reload items
      await loadPantryData()
    } catch (err) {
      console.error("Error deleting pantry item:", err)
      setError("An error occurred while deleting the item.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIncrementItem = async (item: any) => {
    try {
      setUpdatingItemId(item.id)
      await incrementPantryItemCount(item.id)
      await loadPantryData()
    } catch (err) {
      console.error("Error incrementing item count:", err)
      setError("An error occurred while updating the count.")
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleDecrementItem = async (item: any) => {
    try {
      setUpdatingItemId(item.id)
      await decrementPantryItemCount(item.id)
      await loadPantryData()
    } catch (err) {
      console.error("Error decrementing item count:", err)
      setError("An error occurred while updating the count.")
    } finally {
      setUpdatingItemId(null)
    }
  }

  const handleEditItemClick = (item: any) => {
    setEditingItem(item)
    setIsEditItemDialogOpen(true)
  }

  const handleDeleteItemClick = (item: any) => {
    setDeletingItem(item)
    setIsDeleteItemDialogOpen(true)
  }

  // Functie om de volgorde van items bij te werken na drag & drop
  const handleDragEnd = async (event: any, listId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    try {
      // Maak een kopie van de items voor deze lijst
      const items = [...itemsByList[listId]]

      // Vind de indices van de gesleepte en doelitems
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      // Verplaats het item in de array
      const [movedItem] = items.splice(oldIndex, 1)
      items.splice(newIndex, 0, movedItem)

      // Update de positie van alle items
      const updatedItems = items.map((item, index) => ({
        ...item,
        position: index,
      }))

      // Update de state onmiddellijk om de UI bij te werken
      const newItemsByList = {
        ...itemsByList,
        [listId]: updatedItems,
      }
      setItemsByList(newItemsByList)

      // Update de database voor alle items in de nieuwe volgorde
      // Dit zorgt ervoor dat alle items de juiste relatieve positie hebben
      for (let i = 0; i < updatedItems.length; i++) {
        await updateShoppingItemPosition(updatedItems[i].id, i)
      }

      console.log("Positions updated successfully")
    } catch (error) {
      console.error("Error updating item positions:", error)
      // Bij een fout, herlaad de data om de oorspronkelijke volgorde te herstellen
      await loadPantryData()
    }
  }

  // Voeg deze functie toe aan de PantryPage component, na de handleDragEnd functie
  // Functie om de volgorde van lijsten bij te werken na drag & drop
  const handleTabDragEnd = async (event: any) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    try {
      // Maak een kopie van de lijsten
      const lists = [...pantryLists]

      // Vind de indices van de gesleepte en doellijsten
      const oldIndex = lists.findIndex((list) => list.id === active.id)
      const newIndex = lists.findIndex((list) => list.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      // Verplaats de lijst in de array
      const [movedList] = lists.splice(oldIndex, 1)
      lists.splice(newIndex, 0, movedList)

      // Update de positie van alle lijsten
      const updatedLists = lists.map((list, index) => ({
        ...list,
        position: index,
      }))

      // Update de state onmiddellijk om de UI bij te werken
      setPantryLists(updatedLists)

      // Update de database voor alle lijsten in de nieuwe volgorde
      for (let i = 0; i < updatedLists.length; i++) {
        await updatePantryListPosition(updatedLists[i].id, i)
      }

      console.log("List positions updated successfully")
    } catch (error) {
      console.error("Error updating list positions:", error)
      // Bij een fout, herlaad de data om de oorspronkelijke volgorde te herstellen
      await loadPantryData()
    }
  }

  const loadPantryData = async () => {
    try {
      setLoading(true)

      // Load pantry lists
      const lists = await getPantryLists()
      setPantryLists(lists)

      // Controleer of er nieuwe lijsten zijn en wijs kleuren toe
      const updatedColors = initializeListColors(lists, listColors)
      if (Object.keys(updatedColors).length !== Object.keys(listColors).length) {
        setListColors(updatedColors)
        saveListColors(updatedColors)
      }

      // If there are lists, set the default list for new items
      if (lists.length > 0 && !newItemListId) {
        setNewItemListId(lists[0].id)
      }

      // If there are lists but no active tab, set the first list as active
      if (lists.length > 0 && !activeTab) {
        setActiveTab(lists[0].id)
      }

      // Load pantry items grouped by list
      const items = await getPantryItemsByList()

      // Add label names to items
      const itemsWithLabelNames: Record<string, any[]> = {}
      Object.keys(items).forEach((listId) => {
        itemsWithLabelNames[listId] = items[listId].map((item) => ({
          ...item,
          labelName: labels.find((l) => l.id === item.label)?.name || item.label,
        }))
      })

      setItemsByList(itemsWithLabelNames)
    } catch (err) {
      console.error("Error loading pantry data:", err)
      setError("An error occurred while loading the data.")
    } finally {
      setLoading(false)
    }
  }

  // Functie om de kleur van een lijst te krijgen
  const getListColor = (listId: string): string => {
    return listColors[listId] || "gray"
  }

  // Functie om de kleur van een lijst bij te werken
  const updateListColor = (listId: string, color: string) => {
    const newColors = { ...listColors, [listId]: color }
    setListColors(newColors)
    saveListColors(newColors)
  }

  // Functie om de kleuren bij te werken na het sluiten van de ListManager
  const handleListManagerClose = () => {
    setIsListManagerOpen(false)
    // Laad de kleuren opnieuw uit localStorage
    const savedColors = loadListColors()
    setListColors(savedColors)
    loadPantryData()
  }

  // Functie om een nieuw item toe te voegen aan een specifieke lijst
  const handleAddItemToList = (listId: string) => {
    setNewItemListId(listId)
    setNewItemName("")
    setNewItemQuantity("")
    setNewItemLabel("")
    setIsAddItemDialogOpen(true)
  }

  // Vervang de loading check met deze verbeterde versie die een retry knop toont
  // Vervang de regel: if (loading) { ... } met:

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="animate-pulse mb-4">Loading pantry items...</div>
        <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
          Refresh
        </Button>
      </div>
    )
  }

  // Functie om de juiste CSS klasse te genereren voor de lijst border
  const getListBorderClass = (color: string) => {
    switch (color) {
      case "blue":
        return "border-t-blue-500"
      case "green":
        return "border-t-green-500"
      case "red":
        return "border-t-red-500"
      case "purple":
        return "border-t-purple-500"
      case "yellow":
        return "border-t-yellow-500"
      case "orange":
        return "border-t-orange-500"
      case "pink":
        return "border-t-pink-500"
      default:
        return "border-t-gray-500"
    }
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Package className="h-6 w-6 mr-2 text-[#4285F4]" />
          <h1 className="text-2xl font-bold text-gray-800">Pantry</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsListManagerOpen(true)}>
            Manage Lists
          </Button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 border border-red-300 rounded-md bg-red-50 text-red-700">{error}</div>}

      {pantryLists.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>You haven't created any lists yet. Create a list to keep track of your pantry.</p>
            <Button onClick={() => setIsListManagerOpen(true)} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create your first list
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs voor de lijsten */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTabDragEnd}
              modifiers={[restrictToHorizontalAxis]}
            >
              <SortableContext items={pantryLists.map((list) => list.id)} strategy={horizontalListSortingStrategy}>
                <TabsList className="mb-4 w-full flex flex-wrap justify-start gap-2 bg-gray-100 border border-gray-200 rounded-md p-2">
                  {pantryLists.map((list) => (
                    <SortableTab
                      key={list.id}
                      list={list}
                      activeTab={activeTab}
                      itemCount={itemsByList[list.id]?.length || 0}
                      listColor={getListColor(list.id)}
                    />
                  ))}
                </TabsList>
              </SortableContext>
            </DndContext>

            {pantryLists.map((list) => {
              const items = itemsByList[list.id] || []
              const listColor = getListColor(list.id)
              const borderClass = getListBorderClass(listColor)

              return (
                <TabsContent key={list.id} value={list.id} className="mt-0">
                  <Card className={`border-t-4 ${borderClass}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-xl">{list.title}</CardTitle>
                        <Button
                          size="icon"
                          className="h-8 w-8 rounded-full bg-[#4285F4] hover:bg-[#3367d6] text-white"
                          onClick={() => handleAddItemToList(list.id)}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {items.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <p>This list is empty.</p>
                          <Button onClick={() => handleAddItemToList(list.id)} variant="ghost" className="mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Item
                          </Button>
                        </div>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, list.id)}
                          modifiers={[restrictToVerticalAxis]}
                        >
                          <SortableContext
                            items={(itemsByList[list.id] || []).map((item) => item.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <ul className="divide-y">
                              {(itemsByList[list.id] || []).map((item) => (
                                <SortableItem
                                  key={item.id}
                                  item={item}
                                  onEdit={handleEditItemClick}
                                  onDelete={handleDeleteItemClick}
                                  onIncrement={handleIncrementItem}
                                  onDecrement={handleDecrementItem}
                                  updatingItemId={updatingItemId}
                                />
                              ))}
                            </ul>
                          </SortableContext>
                        </DndContext>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        </>
      )}

      {/* List Manager Dialog */}
      <ListManager isOpen={isListManagerOpen} onClose={handleListManagerClose} />

      {/* Add Item Dialog - Met label veld */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-4 mb-4">
              <label htmlFor="name" className="text-sm font-medium w-16 flex-shrink-0 text-black">
                Item
              </label>
              <Input
                id="name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Milk, Bread, Rice"
                required
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="label" className="text-sm font-medium w-16 flex-shrink-0 text-black">
                Label
              </label>
              <select
                id="label"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                required
              >
                <option value="" disabled>
                  Select a label
                </option>
                {labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Item *
                </label>
                <Input
                  id="edit-name"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="e.g. Milk, Bread, Rice"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-quantity" className="text-sm font-medium">
                  Quantity
                </label>
                <Input
                  id="edit-quantity"
                  value={editingItem.quantity || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, quantity: e.target.value })}
                  placeholder="e.g. 1L, 500g, 2 pieces"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-list" className="text-sm font-medium">
                  List *
                </label>
                <select
                  id="edit-list"
                  value={editingItem.list_id}
                  onChange={(e) => setEditingItem({ ...editingItem, list_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  required
                >
                  {pantryLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="edit-label" className="text-sm font-medium">
                  Label *
                </label>
                <select
                  id="edit-label"
                  value={editingItem.label}
                  onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  required
                >
                  {labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={isDeleteItemDialogOpen} onOpenChange={setIsDeleteItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>

          <p>Are you sure you want to delete "{deletingItem?.name}"? This action cannot be undone.</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteItemDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
