"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart, Utensils, Calendar, Package, Home } from "lucide-react"

export default function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-10">
      <div className="container mx-auto">
        <div className="flex justify-around items-center">
          <Link
            href="/"
            className={`flex flex-col items-center p-2 ${isActive("/") ? "text-[#4285F4]" : "text-gray-500"}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>

          <Link
            href="/recepten"
            className={`flex flex-col items-center p-2 ${isActive("/recepten") ? "text-[#4285F4]" : "text-gray-500"}`}
          >
            <Utensils className="w-6 h-6" />
            <span className="text-xs mt-1">Recipes</span>
          </Link>

          <Link
            href="/planner"
            className={`flex flex-col items-center p-2 ${isActive("/planner") ? "text-[#4285F4]" : "text-gray-500"}`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">Planner</span>
          </Link>

          <Link
            href="/boodschappenlijst"
            className={`flex flex-col items-center p-2 ${isActive("/boodschappenlijst") ? "text-[#4285F4]" : "text-gray-500"}`}
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-xs mt-1">To Buy</span>
          </Link>

          <Link
            href="/pantry"
            className={`flex flex-col items-center p-2 ${isActive("/pantry") ? "text-[#4285F4]" : "text-gray-500"}`}
          >
            <Package className="w-6 h-6" />
            <span className="text-xs mt-1">Pantry</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
