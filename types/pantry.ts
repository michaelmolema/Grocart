export interface PantryItem {
  id: string | number
  name: string
  quantity: string | number
  label?: string
  label_id?: number | null
  created_at?: string
  checked?: boolean
  checked_at?: string | null
  list_id?: string
  added_to_list?: boolean
  position?: number
}
