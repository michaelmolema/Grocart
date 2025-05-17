"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ChefHat, CalendarDays, ShoppingBag, Package } from "lucide-react"
import { cn } from "@/lib/utils"

const routes = [
  {
    name: "Home",
    path: "/",
    icon: Home,
  },
  {
    name: "Recipes",
    path: "/recipes",
    icon: ChefHat,
  },
  {
    name: "Planner",
    path: "/planner",
    icon: CalendarDays,
  },
  {
    name: "To Buy",
    path: "/to-buy",
    icon: ShoppingBag,
  },
  {
    name: "Pantry",
    path: "/pantry",
    icon: Package,
  },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-10">
      <div className="flex justify-around items-center h-16">
        {routes.map((route) => {
          const Icon = route.icon
          const isActive = pathname === route.path || (route.path !== "/" && pathname.startsWith(route.path))

          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{route.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
