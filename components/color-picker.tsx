"use client"

import { RECIPE_COLORS } from "./recipe-list"

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {RECIPE_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`w-8 h-8 rounded-full border-2 ${
            value === color.id ? "ring-2 ring-offset-2 ring-[#4285F4]" : ""
          } ${color.id ? `bg-${color.id}-500` : "bg-white border-gray-300"}`}
          style={{
            backgroundColor: color.id ? undefined : "white",
            borderColor: color.id ? undefined : "#d1d5db",
          }}
          onClick={() => onChange(color.id)}
          title={color.name}
        />
      ))}
    </div>
  )
}
