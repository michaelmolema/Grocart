"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"

interface ShoppingListProps {
  label: {
    id: string
    name: string
    color: string
    label_type: string
  }
  items: {
    id: string
    name: string
    quantity: string
    checked: boolean
    label: string
    recipe_name?: string
  }[]
}

export default function ShoppingList({ label, items }: ShoppingListProps) {
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({})

  const handleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">
        {label.name} ({items.length})
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between p-3 border rounded-md">
            <div className="flex items-center gap-2">
              <Checkbox
                id={item.id}
                checked={checkedItems[item.id] || false}
                onCheckedChange={() => handleCheck(item.id)}
              />
              <label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                {item.name} {item.quantity && `(${item.quantity})`}
                {item.recipe_name && <span className="text-muted-foreground"> - {item.recipe_name}</span>}
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
