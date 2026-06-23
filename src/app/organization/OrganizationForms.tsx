"use client"

import { useState } from "react"
import { createBranch, deleteBranch, createUnit, deleteUnit } from "@/app/actions/organization"
import { addCostItem, deleteCostItem } from "@/app/actions/cost"
import { AlertCircle, Trash2, Plus, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"

export function BranchForm() {
  const router = useRouter()
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    const res = await createBranch(formData)
    if (!res.success) setError(res.error || "Failed to create branch")
    else {
      (e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
      <input type="text" name="name" required placeholder="Branch Name (e.g. HQ)" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      <input type="text" name="location" placeholder="Location" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center">
        <Plus className="h-4 w-4 mr-1" /> Add
      </button>
      {error && <div className="absolute mt-12 text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{error}</div>}
    </form>
  )
}

export function UnitForm({ branches }: { branches: any[] }) {
  const router = useRouter()
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    const res = await createUnit(formData)
    if (!res.success) setError(res.error || "Failed to create unit")
    else {
      (e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
      <input type="text" name="name" required placeholder="Unit Name (e.g. Finance)" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      <select name="branchId" required className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
        <option value="">Select Branch</option>
        {branches.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center">
        <Plus className="h-4 w-4 mr-1" /> Add
      </button>
      {error && <div className="absolute mt-12 text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{error}</div>}
    </form>
  )
}



export function DeleteButton({ id, type }: { id: string, type: "branch" | "unit" | "costItem" }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return
    
    let res;
    if (type === "branch") res = await deleteBranch(id)
    else if (type === "unit") res = await deleteUnit(id)
    else if (type === "costItem") res = await deleteCostItem(id)

    if (!res?.success) alert(`Error deleting item.`)
    else router.refresh()
  }

  return (
    <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

export function CostCatalogForm() {
  const router = useRouter()
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    const res = await addCostItem(formData)
    if (!res.success) setError(res.error || "Failed to create cost item")
    else {
      (e.target as HTMLFormElement).reset()
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
      <input type="text" name="itemName" required placeholder="Item/Service (e.g. RAM DDR5)" className="flex-[2] px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
      <input type="number" step="0.01" name="defaultCost" required placeholder="Cost (RM)" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center">
        <Plus className="h-4 w-4 mr-1" /> Add
      </button>
      {error && <div className="absolute mt-12 text-xs text-red-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{error}</div>}
    </form>
  )
}
