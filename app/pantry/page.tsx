"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Package, Plus, Minus, Edit, Trash2, GripVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ColorSelector } from "@/components/color-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface PantryList {
  id: string
  title: string
  position: number
  color: string
}

interface PantryItem {
  id: string
  name: string
  label: string
  count: number
  list_id: string
  position?: number
  label_name?: string
}

interface ShoppingLabel {
  id: string
  name: string
  color: string
  label_type: string
}

function SortablePantryItem({
  item,
  onIncrement,
  onDecrement,
  onEdit,
  onDelete,
}: {
  item: PantryItem
  onIncrement: (item: PantryItem) => void
  onDecrement: (item: PantryItem) => void
  onEdit: (item: PantryItem) => void
  onDelete: (item: PantryItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
    >
      <button className="cursor-grab touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="flex-1">
        <div className="font-medium">{item.name}</div>
        {item.label_name && <div className="text-xs text-muted-foreground">Label: {item.label_name}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onDecrement(item)}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center">{item.count || 0}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onIncrement(item)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(item)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function SortablePantryList({ list }: { list: PantryList }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border-t first:border-t-0">
      <div className="flex items-center gap-2">
        <button className="cursor-grab touch-none" {...attributes} {...listeners}>
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <div
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor: list.color,
            ...(list.color === "transparent" && {
              backgroundImage:
                "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
            }),
          }}
        ></div>
        <span>{list.title}</span>
      </div>
    </div>
  )
}

export default function PantryPage() {
  const [pantryLists, setPantryLists] = useState<PantryList[]>([])
  const [pantryItems, setPantryItems] = useState<{ [key: string]: PantryItem[] }>({})
  const [activeList, setActiveList] = useState<string | null>(null)
  const [labels, setLabels] = useState<ShoppingLabel[]>([])
  const [showManageListsModal, setShowManageListsModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showEditItemModal, setShowEditItemModal] = useState(false)
  const [showEditListModal, setShowEditListModal] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [newItemLabel, setNewItemLabel] = useState("none") // Changed from empty string to "none"
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null)
  const [newListName, setNewListName] = useState("")
  const [newListColor, setNewListColor] = useState("#4285F4") // Google blue default
  const [editingList, setEditingList] = useState<PantryList | null>(null)

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
    fetchData()
  }, [])

  async function fetchData() {
    // Fetch pantry lists
    const { data: listsData, error: listsError } = await supabase.from("pantry_lists").select("*").order("position")

    if (listsError) {
      console.error("Error fetching pantry lists:", listsError)
      return
    }

    // Add color property if it doesn't exist
    const listsWithColor = listsData.map((list) => ({
      ...list,
      color: list.color || "#4285F4", // Default to Google blue if no color
    }))

    setPantryLists(listsWithColor || [])

    // Set active list to the first list if available
    if (listsWithColor && listsWithColor.length > 0 && !activeList) {
      setActiveList(listsWithColor[0].id)
    }

    // Fetch labels
    const { data: labelsData, error: labelsError } = await supabase.from("labels").select("*")

    if (labelsError) {
      console.error("Error fetching labels:", labelsError)
      return
    }

    setLabels(labelsData || [])

    const labelsMap: { [key: string]: { name: string; color: string } } = {}
    labelsData.forEach((label) => {
      labelsMap[label.id] = { name: label.name, color: label.color }
    })

    // Fetch pantry items
    const { data: itemsData, error: itemsError } = await supabase.from("pantry_items").select("*")

    if (itemsError) {
      console.error("Error fetching pantry items:", itemsError)
      return
    }

    // Group items by list_id
    const groupedItems: { [key: string]: PantryItem[] } = {}
    itemsData.forEach((item) => {
      if (!groupedItems[item.list_id]) {
        groupedItems[item.list_id] = []
      }

      groupedItems[item.list_id].push({
        ...item,
        label_name: labelsMap[item.label]?.name,
      })
    })

    // Sort items by id als fallback
    Object.keys(groupedItems).forEach((listId) => {
      groupedItems[listId].sort((a, b) => {
        return a.id.localeCompare(b.id)
      })
    })

    setPantryItems(groupedItems)
  }

  const handleAddList = async () => {
    if (!newListName.trim()) return

    try {
      // Add to the database - without color field
      const { data, error } = await supabase
        .from("pantry_lists")
        .insert([
          {
            title: newListName.trim(),
            position: pantryLists.length,
            // color field removed from database insert
          },
        ])
        .select()

      if (error) {
        console.error("Error adding list:", error)
        return
      }

      if (data && data.length > 0) {
        // Add the color in the local state
        setPantryLists((prev) => [
          ...prev,
          {
            ...data[0],
            color: newListColor, // Add color in local state only
          },
        ])
      }

      // Reset form
      setNewListName("")
      setNewListColor("#4285F4")
    } catch (error) {
      console.error("Error adding list:", error)
    }
  }

  const handleEditList = (list: PantryList) => {
    setEditingList(list)
    setNewListName(list.title)
    setNewListColor(list.color)
    setShowEditListModal(true)
  }

  const saveEditedList = async () => {
    if (!editingList || !newListName.trim()) return

    try {
      // Update in the database - only update the title since color column doesn't exist
      const { error } = await supabase
        .from("pantry_lists")
        .update({
          title: newListName.trim(),
          // color field removed from database update
        })
        .eq("id", editingList.id)

      if (error) {
        console.error("Error updating list:", error)
        return
      }

      // Still update both title and color in the local state
      setPantryLists((prev) =>
        prev.map((list) =>
          list.id === editingList.id
            ? {
                ...list,
                title: newListName.trim(),
                color: newListColor,
              }
            : list,
        ),
      )

      setShowEditListModal(false)
      setEditingList(null)
      setNewListName("")
      setNewListColor("#4285F4")
    } catch (error) {
      console.error("Error updating list:", error)
    }
  }

  const handleDeleteList = async (id: string) => {
    try {
      // Delete from database
      const { error } = await supabase.from("pantry_lists").delete().eq("id", id)

      if (error) {
        console.error("Error deleting list:", error)
        return
      }

      setPantryLists((prev) => prev.filter((list) => list.id !== id))

      // If deleting active list, switch to another one
      if (activeList === id && pantryLists.length > 1) {
        const newActiveList = pantryLists.find((list) => list.id !== id)
        if (newActiveList) {
          setActiveList(newActiveList.id)
        }
      }
    } catch (error) {
      console.error("Error deleting list:", error)
    }
  }

  const handleListDragEnd = async (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setPantryLists((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const newItems = arrayMove(items, oldIndex, newIndex)

        // Update positions in database
        updateListPositions(newItems)

        return newItems
      })
    }
  }

  const updateListPositions = async (lists: PantryList[]) => {
    try {
      // Update positions in database
      for (let i = 0; i < lists.length; i++) {
        await supabase.from("pantry_lists").update({ position: i }).eq("id", lists[i].id)
      }
    } catch (error) {
      console.error("Error updating list positions:", error)
    }
  }

  const handleAddItem = async () => {
    if (!activeList || !newItemName.trim()) return

    try {
      // Voeg toe aan de database
      const { data, error } = await supabase
        .from("pantry_items")
        .insert([
          {
            name: newItemName.trim(),
            label: newItemLabel === "none" ? null : newItemLabel, // Use null if "none" is selected
            count: 0,
            list_id: activeList,
          },
        ])
        .select()

      if (error) {
        console.error("Error adding item:", error)
        return
      }

      if (data && data.length > 0) {
        // Voeg label_name toe aan het nieuwe item
        const labelName = labels.find((l) => l.id === newItemLabel)?.name
        const newItem = {
          ...data[0],
          label_name: labelName,
        }

        setPantryItems((prev) => ({
          ...prev,
          [activeList]: [...(prev[activeList] || []), newItem],
        }))
      }

      // Reset form
      setNewItemName("")
      setNewItemLabel("none") // Reset to "none"
      setShowAddItemModal(false)
    } catch (error) {
      console.error("Error adding item:", error)
    }
  }

  const handleEditItem = (item: PantryItem) => {
    setEditingItem(item)
    setNewItemName(item.name)
    setNewItemLabel(item.label || "none") // Use "none" if label is null or empty
    setShowEditItemModal(true)
  }

  const saveEditedItem = async () => {
    if (!editingItem || !newItemName.trim()) return

    try {
      // Update in database
      const { error } = await supabase
        .from("pantry_items")
        .update({
          name: newItemName.trim(),
          label: newItemLabel === "none" ? null : newItemLabel, // Use null if "none" is selected
        })
        .eq("id", editingItem.id)

      if (error) {
        console.error("Error updating item:", error)
        return
      }

      // Update in state
      const labelName = labels.find((l) => l.id === newItemLabel)?.name

      setPantryItems((prev) => ({
        ...prev,
        [editingItem.list_id]: prev[editingItem.list_id].map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: newItemName.trim(),
                label: newItemLabel === "none" ? null : newItemLabel,
                label_name: labelName,
              }
            : item,
        ),
      }))

      setShowEditItemModal(false)
      setEditingItem(null)
      setNewItemName("")
      setNewItemLabel("none") // Reset to "none"
    } catch (error) {
      console.error("Error updating item:", error)
    }
  }

  const handleIncrement = async (item: PantryItem) => {
    const newCount = (item.count || 0) + 1

    try {
      // Update in database
      const { error } = await supabase.from("pantry_items").update({ count: newCount }).eq("id", item.id)

      if (error) {
        console.error("Error updating item count:", error)
        return
      }

      // Update local state
      setPantryItems((prev) => ({
        ...prev,
        [item.list_id]: prev[item.list_id].map((i) => (i.id === item.id ? { ...i, count: newCount } : i)),
      }))

      // Als er een label is ingesteld, voeg het item toe aan de boodschappenlijst
      if (item.label) {
        // Controleer of het item al op de boodschappenlijst staat
        const { data: existingItems, error: checkError } = await supabase
          .from("shopping_items")
          .select("*")
          .eq("pantry_item_id", item.id)

        if (checkError) {
          console.error("Error checking shopping items:", checkError)
          return
        }

        if (existingItems && existingItems.length > 0) {
          // Update bestaand item
          await supabase.from("shopping_items").update({ quantity: newCount.toString() }).eq("id", existingItems[0].id)
        } else {
          // Voeg nieuw item toe
          await supabase.from("shopping_items").insert([
            {
              name: item.name,
              quantity: newCount.toString(),
              label: item.label,
              checked: false,
              pantry_item_id: item.id,
            },
          ])
        }
      }
    } catch (error) {
      console.error("Error updating item count:", error)
    }
  }

  const handleDecrement = async (item: PantryItem) => {
    if (item.count <= 0) return

    const newCount = item.count - 1

    try {
      // Update in database
      const { error } = await supabase.from("pantry_items").update({ count: newCount }).eq("id", item.id)

      if (error) {
        console.error("Error updating item count:", error)
        return
      }

      // Update local state
      setPantryItems((prev) => ({
        ...prev,
        [item.list_id]: prev[item.list_id].map((i) => (i.id === item.id ? { ...i, count: newCount } : i)),
      }))

      // Als er een label is ingesteld, update het item op de boodschappenlijst
      if (item.label) {
        // Controleer of het item al op de boodschappenlijst staat
        const { data: existingItems, error: checkError } = await supabase
          .from("shopping_items")
          .select("*")
          .eq("pantry_item_id", item.id)

        if (checkError) {
          console.error("Error checking shopping items:", checkError)
          return
        }

        if (existingItems && existingItems.length > 0) {
          if (newCount === 0) {
            // Verwijder item als count 0 is
            await supabase.from("shopping_items").delete().eq("id", existingItems[0].id)
          } else {
            // Update bestaand item
            await supabase
              .from("shopping_items")
              .update({ quantity: newCount.toString() })
              .eq("id", existingItems[0].id)
          }
        }
      }
    } catch (error) {
      console.error("Error updating item count:", error)
    }
  }

  const handleDeleteItem = async (item: PantryItem) => {
    try {
      // Delete from database
      const { error } = await supabase.from("pantry_items").delete().eq("id", item.id)

      if (error) {
        console.error("Error deleting item:", error)
        return
      }

      // Remove from local state
      setPantryItems((prev) => ({
        ...prev,
        [item.list_id]: prev[item.list_id].filter((i) => i.id !== item.id),
      }))

      // Verwijder ook van de boodschappenlijst als het daar staat
      await supabase.from("shopping_items").delete().eq("pantry_item_id", item.id)
    } catch (error) {
      console.error("Error deleting item:", error)
    }
  }

  const handleDragEnd = async (event: any) => {
    if (!activeList) return

    const { active, over } = event

    if (active.id !== over.id) {
      setPantryItems((prev) => {
        const oldItems = [...prev[activeList]]
        const oldIndex = oldItems.findIndex((item) => item.id === active.id)
        const newIndex = oldItems.findIndex((item) => item.id === over.id)

        const newItems = arrayMove(oldItems, oldIndex, newIndex)

        return {
          ...prev,
          [activeList]: newItems,
        }
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Pantry</h1>
        </div>
        <Button variant="outline" onClick={() => setShowManageListsModal(true)}>
          Manage Lists
        </Button>
      </div>

      {(pantryLists.length > 0 && (
        <Tabs value={activeList || undefined} onValueChange={setActiveList} className="w-full">
          <TabsList className="w-full overflow-x-auto">
            {pantryLists.map((list) => (
              <TabsTrigger key={list.id} value={list.id} className="flex items-center gap-2">
                {list.title}
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {pantryItems[list.id]?.length || 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {pantryLists.map((list) => (
            <TabsContent key={list.id} value={list.id} className="mt-4 space-y-4">
              {/* Horizontal colored stripe */}
              <div
                className="h-1 w-full rounded-full"
                style={{
                  backgroundColor: list.color,
                  ...(list.color === "transparent" && {
                    backgroundImage:
                      "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                  }),
                }}
              ></div>

              {/* List of pantry items */}
              <div className="space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext
                    items={pantryItems[list.id]?.map((item) => item.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {pantryItems[list.id]?.map((item) => (
                      <SortablePantryItem
                        key={item.id}
                        item={item}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {(!pantryItems[list.id] || pantryItems[list.id].length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items in this list. Add some items to get started.
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10 bg-blue-500 hover:bg-blue-600"
                  onClick={() => setShowAddItemModal(true)}
                >
                  <Plus className="h-5 w-5 text-white" />
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )) || <div className="text-center text-muted-foreground">No pantry lists created.</div>}

      {/* Manage Lists Modal */}
      <Dialog open={showManageListsModal} onOpenChange={setShowManageListsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Lists</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add New List Form - Now at the top */}
            <div className="space-y-3">
              <h3 className="font-medium">Add New List</h3>
              <div className="space-y-2">
                <Label htmlFor="label-name">List Name</Label>
                <Input
                  id="label-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list name"
                />
              </div>
              <div className="space-y-2">
                <Label>List Color</Label>
                <ColorSelector selectedColor={newListColor} onColorChange={setNewListColor} />
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={handleAddList}
                  disabled={!newListName.trim()}
                >
                  Add List
                </Button>
              </div>
            </div>

            {/* List List with drag and drop */}
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-medium">Your Lists</h3>
              <div className="border rounded-md overflow-hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleListDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext items={pantryLists.map((list) => list.id)} strategy={verticalListSortingStrategy}>
                    {pantryLists.map((list) => (
                      <div key={list.id} className="flex items-center justify-between">
                        <SortablePantryList list={list} />
                        <div className="flex gap-2 pr-3">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditList(list)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteList(list.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
                {pantryLists.length === 0 && (
                  <div className="p-3 text-center text-muted-foreground">
                    No lists yet. Create your first list above.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit List Modal */}
      <Dialog open={showEditListModal} onOpenChange={setShowEditListModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-label-name">List Name</Label>
              <Input
                id="edit-label-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name"
              />
            </div>
            <div className="space-y-2">
              <Label>List Color</Label>
              <ColorSelector selectedColor={newListColor} onColorChange={setNewListColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditListModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={saveEditedList} disabled={!newListName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Modal */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to List</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-label">Label</Label>
              <Select value={newItemLabel} onValueChange={setNewItemLabel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No label</SelectItem>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleAddItem} disabled={!newItemName.trim()}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={showEditItemModal} onOpenChange={setShowEditItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-item-name">Item Name</Label>
              <Input
                id="edit-item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-label">Label</Label>
              <Select value={newItemLabel} onValueChange={setNewItemLabel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No label</SelectItem>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemModal(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={saveEditedItem} disabled={!newItemName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
