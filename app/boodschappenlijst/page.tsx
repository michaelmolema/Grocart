import { Suspense } from "react"
import ShoppingList from "./shopping-list"

export default async function ShoppingListPage() {
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ShoppingList />
      </Suspense>
    </div>
  )
}
