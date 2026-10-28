"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Plus, Minus, FileText, Search, PackageOpen, AlertCircle, 
  Trash2, ArrowUpDown, RefreshCw, X, Calendar, Printer, User, MessageSquare,
  Image as ImageIcon, Upload, Tag, Pencil, Briefcase, HeartHandshake, Box, Layers, QrCode, CheckCircle2, XCircle, Clock, Send, Camera,
  ChevronDown, ChevronRight, Sparkles, PlusCircle, Check, FileSpreadsheet, FileDown, RotateCcw, Filter
} from "lucide-react"
import {
  getMarketingItems,
  addMarketingStock, 
  withdrawMarketingStock, 
  deleteMarketingItem, 
  getMarketingStockReport,
  uploadMarketingItemPhotoAction,
  editMarketingItemMaster
} from "@/app/actions/marketing-inventory"
import { exportMarketingStockMovementExcel } from "@/lib/excel/exportMarketingStockMovementExcel"
import { generateMarketingStockMovementPdf } from "@/lib/pdf/generateMarketingStockMovementPdf"
import { MarketingNavTabs } from "@/components/marketing/MarketingNavTabs"
import { TablePagination } from "@/components/ui/TablePagination"
import { 
  getMarketingMerchandiseRequests, 
  approveMarketingMerchandiseRequest, 
  rejectMarketingMerchandiseRequest 
} from "@/app/actions/marketing-requests"

export type ItemVariant = {
  id: string
  itemId: string
  variantName: string
  attributes: any
  sku?: string | null
  quantity: number
  pricePerUnit?: number | null
  costPerUnit?: number | null
  sellingPricePerUnit?: number | null
  imageUrl?: string | null
  createdAt?: Date
  updatedAt?: Date
}

type Item = {
  id: string
  name: string
  brand?: string | null
  category?: string | null
  location: string
  department?: string | null
  quantity: number
  unit: string
  pricePerUnit: number
  costPerUnit?: number | null
  sellingPricePerUnit?: number | null
  imageUrl?: string | null
  hasVariants?: boolean
  variantConfig?: Array<{ name: string; options: string[] }> | any
  variants?: ItemVariant[]
  createdAt: Date
  updatedAt: Date
}

type StockLog = {
  id: string
  itemId: string
  variantId?: string | null
  variantName?: string | null
  type: string
  quantity: number
  totalPrice?: number | null
  totalCost?: number | null
  pricePerUnit?: number | null
  costPerUnit?: number | null
  sellingPricePerUnit?: number | null
  department?: string | null
  handledBy: string
  remarks: string | null
  createdAt: Date
  item: {
    id?: string
    name: string
    unit: string
    location: string
    category?: string | null
    brand?: string | null
    pricePerUnit?: number | null
    costPerUnit?: number | null
    sellingPricePerUnit?: number | null
  }
  variant?: {
    id: string
    variantName: string
    sku?: string | null
  } | null
}

type Props = {
  initialItems: Item[]
  initialLogs: any[]
  initialRequests?: any[]
  userName: string
  userModules?: string[]
  isSuperAdmin?: boolean
}

const CATEGORIES = [
  { id: "ALL", label: "ALL" },
  { id: "MERCHANDISE", label: "MERCHANDISE" },
  { id: "POSM", label: "POSM / DISPLAY" },
  { id: "EVENT_ASSET", label: "EVENT ASSETS" },
  { id: "PROMO", label: "PROMOTIONAL" },
  { id: "APPAREL", label: "APPAREL / UNIFORM" },
]

const LOCATIONS = [
  "HQ Store",
  "Rantau Warehouse",
  "Pedas Plant",
  "Event Venue / On-site",
  "Other / Partner Location"
]

/**
 * Automatically compress photos on mobile before upload to prevent network timeouts
 * and payload rejection, converting 15MB camera files into crisp ~500KB JPEG images.
 */
async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    return file
  }
  if (file.size < 400 * 1024 && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg"
            const compressed = new File([blob], cleanName, { type: "image/jpeg" })
            resolve(compressed)
          },
          "image/jpeg",
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export function MarketingInventoryClient({ 
  initialItems, 
  initialLogs, 
  initialRequests = [],
  userName,
  userModules,
  isSuperAdmin = false,
}: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [logs, setLogs] = useState<StockLog[]>(initialLogs as any)
  const [activeTab, setActiveTab] = useState<"MERCHANDISE" | "REQUISITIONS">("MERCHANDISE")
  const [reqFilterStatus, setReqFilterStatus] = useState<string>("ALL")
  const [merchandiseRequests, setMerchandiseRequests] = useState<any[]>(initialRequests)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  
  // Pagination
  const [merchandisePage, setMerchandisePage] = useState(1)
  const [merchandisePageSize, setMerchandisePageSize] = useState(10)
  const [requisitionsPage, setRequisitionsPage] = useState(1)
  const [requisitionsPageSize, setRequisitionsPageSize] = useState(10)
  
  // Add Stock Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isNewItem, setIsNewItem] = useState(false)
  const [selectedAddItemId, setSelectedAddItemId] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [addBrand, setAddBrand] = useState("")
  const [addCategory, setAddCategory] = useState("MERCHANDISE")
  const [addQty, setAddQty] = useState(1)
  const [addTotalPrice, setAddTotalPrice] = useState("")
  const [addSellingPricePerUnit, setAddSellingPricePerUnit] = useState("")
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null)
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null)
  const [addUnit, setAddUnit] = useState("pcs")
  const [addLocation, setAddLocation] = useState("HQ Store")
  const [addHandledBy, setAddHandledBy] = useState(userName)
  const [addRemarks, setAddRemarks] = useState("")

  // Edit Item Master Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editName, setEditName] = useState("")
  const [editBrand, setEditBrand] = useState("")
  const [editCategory, setEditCategory] = useState("MERCHANDISE")
  const [editLocation, setEditLocation] = useState("HQ Store")
  const [editUnit, setEditUnit] = useState("pcs")
  const [editPricePerUnit, setEditPricePerUnit] = useState("0")
  const [editCostPerUnit, setEditCostPerUnit] = useState("0")
  const [editSellingPricePerUnit, setEditSellingPricePerUnit] = useState("0")
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editPhotoRemoved, setEditPhotoRemoved] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  // Withdraw Stock Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [selectedWithdrawItemId, setSelectedWithdrawItemId] = useState("")
  const [selectedWithdrawVariantId, setSelectedWithdrawVariantId] = useState("")
  const [withdrawQty, setWithdrawQty] = useState(1)
  const [withdrawHandledBy, setWithdrawHandledBy] = useState(userName)
  const [withdrawRemarks, setWithdrawRemarks] = useState("")

  // Variant Management States
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set())
  const toggleExpandItem = (itemId: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  // Add Stock Modal - Variants
  const [addHasVariants, setAddHasVariants] = useState(false)
  const [addAttributes, setAddAttributes] = useState<Array<{ name: string; options: string[] }>>([
    { name: "Size", options: ["S", "M", "L", "XL"] }
  ])
  const [newAttrName, setNewAttrName] = useState("")
  const [newAttrOptionInputs, setNewAttrOptionInputs] = useState<Record<number, string>>({})
  const [variantMatrix, setVariantMatrix] = useState<Array<{
    variantName: string
    attributes: Record<string, string>
    sku: string
    quantity: number
  }>>([])
  const [selectedRestockVariantId, setSelectedRestockVariantId] = useState("")

  const handleAddAttribute = () => {
    const trimmed = newAttrName.trim()
    if (!trimmed) return
    if (addAttributes.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
      triggerMessage("error", `Attribute "${trimmed}" already exists.`)
      return
    }
    setAddAttributes(prev => [...prev, { name: trimmed, options: [] }])
    setNewAttrName("")
  }

  const handleRemoveAttribute = (attrIndex: number) => {
    setAddAttributes(prev => prev.filter((_, idx) => idx !== attrIndex))
  }

  const handleAddOptionToAttribute = (attrIndex: number) => {
    const rawVal = (newAttrOptionInputs[attrIndex] || "").trim()
    if (!rawVal) return
    // Support comma-separated options: e.g. "Collar, Round Neck" or "Putih, Hijau, Hitam"
    const parsedOptions = rawVal
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)

    if (parsedOptions.length === 0) return

    setAddAttributes(prev => {
      const copy = [...prev]
      const attr = { ...copy[attrIndex] }
      const currentOpts = new Set(attr.options)
      for (const opt of parsedOptions) {
        currentOpts.add(opt)
      }
      attr.options = Array.from(currentOpts)
      copy[attrIndex] = attr
      return copy
    })
    setNewAttrOptionInputs(prev => ({ ...prev, [attrIndex]: "" }))
  }

  const handleRemoveOptionFromAttribute = (attrIndex: number, optionToRemove: string) => {
    setAddAttributes(prev => {
      const copy = [...prev]
      const attr = { ...copy[attrIndex] }
      attr.options = attr.options.filter(o => o !== optionToRemove)
      copy[attrIndex] = attr
      return copy
    })
  }

  // Recalculate variant combinations when attributes change
  useEffect(() => {
    if (!addHasVariants) {
      setVariantMatrix([])
      return
    }

    const validAttrs = addAttributes.filter(a => a.name.trim() && a.options.length > 0)
    if (validAttrs.length === 0) {
      setVariantMatrix([])
      return
    }

    let combinations: Array<{ nameParts: string[]; attrs: Record<string, string> }> = [{ nameParts: [], attrs: {} }]
    for (const attr of validAttrs) {
      const nextCombos: Array<{ nameParts: string[]; attrs: Record<string, string> }> = []
      for (const prev of combinations) {
        for (const opt of attr.options) {
          nextCombos.push({
            nameParts: [...prev.nameParts, opt],
            attrs: { ...prev.attrs, [attr.name]: opt }
          })
        }
      }
      combinations = nextCombos
    }

    setVariantMatrix(prevMatrix => {
      return combinations.map(combo => {
        const variantName = combo.nameParts.join(" / ")
        const existing = prevMatrix.find(p => p.variantName === variantName)
        return {
          variantName,
          attributes: combo.attrs,
          sku: existing?.sku || "",
          quantity: existing ? existing.quantity : 0
        }
      })
    })
  }, [addAttributes, addHasVariants])

  const totalVariantQty = variantMatrix.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)

  // Detail & Ledger Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState<Item | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  // Report State
  const [isReportSectionOpen, setIsReportSectionOpen] = useState(false)
  const [isRequisitionsModalOpen, setIsRequisitionsModalOpen] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [approvingReqId, setApprovingReqId] = useState<string | null>(null)

  const loadRequisitions = async () => {
    setLoadingRequests(true)
    const res = await getMarketingMerchandiseRequests()
    if (res.success && res.data) {
      setMerchandiseRequests(res.data)
    }
    setLoadingRequests(false)
  }

  useEffect(() => {
    loadRequisitions()
  }, [])

  const handleApproveMerchReq = async (reqId: string) => {
    setApprovingReqId(reqId)
    try {
      const res = await approveMarketingMerchandiseRequest(reqId, userName)
      if (res.success) {
        triggerMessage("success", "Successfully approved and dispensed merchandise!")
        loadRequisitions()
        // Refresh items
        const resItems = await getMarketingItems()
        if (resItems.success && resItems.data) {
          setItems(resItems.data)
        }
      } else {
        triggerMessage("error", res.error || "Failed to approve request.")
      }
    } catch (e: any) {
      triggerMessage("error", e.message)
    } finally {
      setApprovingReqId(null)
    }
  }

  const [rejectingReq, setRejectingReq] = useState<any | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [isRejecting, setIsRejecting] = useState(false)

  const handleOpenRejectModal = (req: any) => {
    setRejectingReq(req)
    setRejectionReason("")
  }

  const handleConfirmRejectMerchReq = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingReq) return
    if (!rejectionReason.trim()) {
      triggerMessage("error", "Please provide a rejection reason.")
      return
    }

    setIsRejecting(true)
    try {
      const res = await rejectMarketingMerchandiseRequest(rejectingReq.id, rejectionReason.trim(), userName)
      if (res.success) {
        triggerMessage("success", "Request rejected.")
        setRejectingReq(null)
        setRejectionReason("")
        loadRequisitions()
      } else {
        triggerMessage("error", res.error || "Failed to reject request.")
      }
    } catch (e: any) {
      triggerMessage("error", e.message)
    } finally {
      setIsRejecting(false)
    }
  }
  const [reportStartDate, setReportStartDate] = useState("")
  const [reportEndDate, setReportEndDate] = useState("")
  const [reportCategory, setReportCategory] = useState("ALL")
  const [reportType, setReportType] = useState("ALL")
  const [reportSearch, setReportSearch] = useState("")
  const [reportLogs, setReportLogs] = useState<StockLog[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  useEffect(() => {
    if (!addPhotoPreview) return
    return () => URL.revokeObjectURL(addPhotoPreview)
  }, [addPhotoPreview])

  useEffect(() => {
    if (!editPhotoPreview) return
    return () => URL.revokeObjectURL(editPhotoPreview)
  }, [editPhotoPreview])

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCat = categoryFilter === "ALL" || (item.category || "MERCHANDISE") === categoryFilter
    return matchesSearch && matchesCat
  })

  const totalStockQty = items.reduce((acc, curr) => acc + curr.quantity, 0)
  const totalCostValue = items.reduce((acc, curr) => {
    const cost = curr.costPerUnit !== undefined && curr.costPerUnit !== null ? curr.costPerUnit : (curr.pricePerUnit || 0)
    return acc + (curr.quantity * cost)
  }, 0)
  const totalSellingValue = items.reduce((acc, curr) => {
    const selling = curr.sellingPricePerUnit !== undefined && curr.sellingPricePerUnit !== null ? curr.sellingPricePerUnit : 0
    return acc + (curr.quantity * selling)
  }, 0)
  const totalEstimatedMargin = totalSellingValue - totalCostValue
  const totalInventoryValue = totalCostValue
  const pendingRequestsCount = merchandiseRequests.filter((r: any) => r.status === "PENDING").length
  const dispatchedRequestsCount = merchandiseRequests.filter((r: any) => r.status === "DISPATCHED").length

  const filteredRequests = merchandiseRequests.filter((r: any) => {
    if (reqFilterStatus === "ALL") return true
    return r.status === reqFilterStatus
  })

  const paginatedItems = filteredItems.slice(
    (merchandisePage - 1) * merchandisePageSize,
    merchandisePage * merchandisePageSize
  )

  const paginatedRequests = filteredRequests.slice(
    (requisitionsPage - 1) * requisitionsPageSize,
    requisitionsPage * requisitionsPageSize
  )

  const totalUniqueItems = items.length
  const recentInCount = logs.filter(l => l.type === "IN").reduce((sum, l) => sum + l.quantity, 0)
  const recentOutCount = logs.filter(l => l.type === "OUT").reduce((sum, l) => sum + l.quantity, 0)
  const selectedAddItem = items.find(item => item.id === selectedAddItemId)
  const addPhotoDisplayUrl = addPhotoPreview || (!isNewItem ? selectedAddItem?.imageUrl || null : null)

  const triggerMessage = (type: "success" | "error", msg: string) => {
    if (type === "success") {
      setSuccessMsg(msg)
      setErrorMsg("")
    } else {
      setErrorMsg(msg)
      setSuccessMsg("")
    }
    setTimeout(() => {
      setSuccessMsg("")
      setErrorMsg("")
    }, 4000)
  }

  const handleAddPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0] || null
    if (!rawFile) return

    if (!rawFile.type.startsWith("image/") && !rawFile.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      setAddPhotoFile(null)
      setAddPhotoPreview(null)
      setErrorMsg("Please select an image file.")
      event.target.value = ""
      return
    }

    try {
      const file = await compressImageFile(rawFile)
      setErrorMsg("")
      setAddPhotoFile(file)
      setAddPhotoPreview(URL.createObjectURL(file))
    } catch {
      setErrorMsg("")
      setAddPhotoFile(rawFile)
      setAddPhotoPreview(URL.createObjectURL(rawFile))
    } finally {
      event.target.value = ""
    }
  }

  // Handle Add Stock (IN)
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")

    if (!isNewItem && !selectedAddItemId) {
      setErrorMsg("Please select an item to restock.")
      setSubmitting(false)
      return
    }

    if (isNewItem && !newItemName.trim()) {
      setErrorMsg("Please enter a name for the new marketing item.")
      setSubmitting(false)
      return
    }

    const priceNum = parseFloat(addTotalPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg("Total cost is mandatory and must be greater than RM 0.00.")
      setSubmitting(false)
      return
    }

    const sellingPriceNum = addSellingPricePerUnit.trim() ? parseFloat(addSellingPricePerUnit) : 0
    if (isNaN(sellingPriceNum) || sellingPriceNum < 0) {
      setErrorMsg("Selling price per unit must be zero or greater.")
      setSubmitting(false)
      return
    }

    if (isNewItem && addHasVariants) {
      if (newAttrName.trim()) {
        setErrorMsg(`You have an unadded attribute "${newAttrName.trim()}". Please click "+ Add Attribute" or clear it before submitting.`)
        setSubmitting(false)
        return
      }
      for (let idx = 0; idx < addAttributes.length; idx++) {
        const pending = (newAttrOptionInputs[idx] || "").trim()
        if (pending) {
          setErrorMsg(`You have an unadded option "${pending}" under "${addAttributes[idx].name}". Please click "+ Add" or clear it before submitting.`)
          setSubmitting(false)
          return
        }
      }
    }

    const qtyNum = isNewItem && addHasVariants ? totalVariantQty : Number(addQty)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg(isNewItem && addHasVariants ? "Total variant quantity must be at least 1." : "Quantity must be at least 1.")
      setSubmitting(false)
      return
    }

    if (!isNewItem && selectedAddItem?.hasVariants && selectedAddItem.variants?.length && !selectedRestockVariantId) {
      setErrorMsg("Please select which variant to restock.")
      setSubmitting(false)
      return
    }

    let uploadedImageUrl: string | null = null
    if (addPhotoFile) {
      const photoFormData = new FormData()
      photoFormData.append("photo", addPhotoFile)
      const uploadRes = await uploadMarketingItemPhotoAction(photoFormData)
      if (uploadRes.success && uploadRes.url) {
        uploadedImageUrl = uploadRes.url
      } else {
        setErrorMsg(uploadRes.error || "Failed to upload item image.")
        setSubmitting(false)
        return
      }
    }

    const payload = {
      itemId: isNewItem ? null : selectedAddItemId,
      variantId: !isNewItem && selectedAddItem?.hasVariants ? selectedRestockVariantId : undefined,
      hasVariants: isNewItem ? addHasVariants : undefined,
      variantConfig: isNewItem && addHasVariants ? addAttributes : undefined,
      variants: isNewItem && addHasVariants ? variantMatrix.map(v => ({
        variantName: v.variantName,
        attributes: v.attributes,
        sku: v.sku.trim() || undefined,
        quantity: Number(v.quantity) || 0,
        pricePerUnit: Number((priceNum / (qtyNum || 1)).toFixed(4)),
        costPerUnit: Number((priceNum / (qtyNum || 1)).toFixed(4)),
        sellingPricePerUnit: sellingPriceNum,
      })) : undefined,
      name: isNewItem ? newItemName.trim().toUpperCase() : "",
      brand: isNewItem ? (addBrand.trim().toUpperCase() || null) : undefined,
      category: isNewItem ? addCategory : undefined,
      quantity: qtyNum,
      totalPrice: priceNum,
      costPerUnit: Number((priceNum / (qtyNum || 1)).toFixed(4)),
      sellingPricePerUnit: sellingPriceNum,
      unit: isNewItem ? addUnit : "",
      handledBy: addHandledBy.trim() || userName,
      remarks: addRemarks.trim() || undefined,
      location: addLocation,
      department: "MARKETING",
      imageUrl: uploadedImageUrl,
    }

    const res = await addMarketingStock(payload)
    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Stock (IN) logged successfully for ${res.data.name}!`)
      setIsAddModalOpen(false)
      
      // Update local items state
      setItems(prev => {
        const idx = prev.findIndex(i => i.id === res.data!.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = res.data!
          return updated
        } else {
          return [...prev, res.data!]
        }
      })

      // Add to recent logs
      const calculatedUnit = Number((priceNum / qtyNum).toFixed(4))
      const newLog: StockLog = {
        id: Math.random().toString(),
        itemId: res.data.id,
        variantId: !isNewItem && selectedAddItem?.hasVariants ? selectedRestockVariantId : undefined,
        variantName: !isNewItem && selectedAddItem?.hasVariants 
          ? selectedAddItem.variants?.find(v => v.id === selectedRestockVariantId)?.variantName 
          : isNewItem && addHasVariants ? "VARIANTS CREATED" : undefined,
        type: "IN",
        quantity: qtyNum,
        totalPrice: priceNum,
        totalCost: priceNum,
        pricePerUnit: calculatedUnit,
        costPerUnit: calculatedUnit,
        sellingPricePerUnit: sellingPriceNum,
        department: "MARKETING",
        handledBy: addHandledBy.trim() || userName,
        remarks: addRemarks.trim() || null,
        createdAt: new Date(),
        item: {
          name: res.data.name,
          unit: res.data.unit,
          location: res.data.location,
          category: res.data.category,
        }
      }
      setLogs(prev => [newLog, ...prev])

      // Reset form
      setNewItemName("")
      setAddBrand("")
      setAddCategory("MERCHANDISE")
      setSelectedAddItemId("")
      setSelectedRestockVariantId("")
      setAddHasVariants(false)
      setAddAttributes([{ name: "Size", options: ["S", "M", "L", "XL"] }])
      setVariantMatrix([])
      setAddQty(1)
      setAddTotalPrice("")
      setAddSellingPricePerUnit("")
      setAddRemarks("")
      setAddPhotoFile(null)
      setAddPhotoPreview(null)
    } else {
      setErrorMsg(res.error || "Failed to add stock.")
    }
  }

  // Handle Withdraw Stock (OUT)
  const handleWithdrawStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg("")

    if (!selectedWithdrawItemId) {
      setErrorMsg("Please select an item to withdraw.")
      setSubmitting(false)
      return
    }

    const targetItem = items.find(i => i.id === selectedWithdrawItemId)
    if (targetItem?.hasVariants && targetItem.variants && targetItem.variants.length > 0 && !selectedWithdrawVariantId) {
      setErrorMsg("Please select which variant to withdraw.")
      setSubmitting(false)
      return
    }

    const qtyNum = Number(withdrawQty)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setErrorMsg("Quantity must be at least 1.")
      setSubmitting(false)
      return
    }

    const res = await withdrawMarketingStock({
      itemId: selectedWithdrawItemId,
      variantId: targetItem?.hasVariants ? selectedWithdrawVariantId : undefined,
      quantity: qtyNum,
      handledBy: withdrawHandledBy.trim() || userName,
      remarks: withdrawRemarks.trim() || undefined,
    })

    setSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Successfully withdrew ${qtyNum} ${res.data.unit} from ${res.data.name}!`)
      setIsWithdrawModalOpen(false)

      setItems(prev => {
        const idx = prev.findIndex(i => i.id === res.data!.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = res.data!
          return updated
        }
        return prev
      })

      const targetVariant = targetItem?.variants?.find(v => v.id === selectedWithdrawVariantId)
      const withdrawalTotal = Number(((targetItem?.pricePerUnit || 0) * qtyNum).toFixed(2))
      const newLog: StockLog = {
        id: Math.random().toString(),
        itemId: res.data.id,
        variantId: targetVariant ? targetVariant.id : undefined,
        variantName: targetVariant ? targetVariant.variantName : undefined,
        type: "OUT",
        quantity: qtyNum,
        totalPrice: withdrawalTotal,
        pricePerUnit: targetItem?.pricePerUnit || 0,
        department: "MARKETING",
        handledBy: withdrawHandledBy.trim() || userName,
        remarks: withdrawRemarks.trim() || null,
        createdAt: new Date(),
        item: {
          name: res.data.name,
          unit: res.data.unit,
          location: res.data.location,
          category: res.data.category,
        }
      }
      setLogs(prev => [newLog, ...prev])

      setSelectedWithdrawItemId("")
      setSelectedWithdrawVariantId("")
      setWithdrawQty(1)
      setWithdrawRemarks("")
    } else {
      setErrorMsg(res.error || "Failed to withdraw stock.")
    }
  }

  // Handle Edit Master
  const handleOpenEditModal = (item: Item) => {
    setEditingItem(item)
    setEditName(item.name)
    setEditBrand(item.brand || "")
    setEditCategory(item.category || "MERCHANDISE")
    setEditLocation(item.location || "HQ Store")
    setEditUnit(item.unit || "pcs")
    const itemCost = item.costPerUnit !== undefined && item.costPerUnit !== null ? item.costPerUnit : (item.pricePerUnit ?? 0)
    setEditPricePerUnit(String(itemCost))
    setEditCostPerUnit(String(itemCost))
    setEditSellingPricePerUnit(String(item.sellingPricePerUnit ?? 0))
    setEditPhotoFile(null)
    setEditPhotoPreview(null)
    setEditPhotoRemoved(false)
    setIsEditModalOpen(true)
  }

  const handleEditPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = event.target.files?.[0] || null
    if (!rawFile) return

    if (!rawFile.type.startsWith("image/") && !rawFile.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      setEditPhotoFile(null)
      setEditPhotoPreview(null)
      setErrorMsg("Please select an image file.")
      event.target.value = ""
      return
    }

    try {
      const file = await compressImageFile(rawFile)
      setErrorMsg("")
      setEditPhotoFile(file)
      setEditPhotoPreview(URL.createObjectURL(file))
      setEditPhotoRemoved(false)
    } catch {
      setErrorMsg("")
      setEditPhotoFile(rawFile)
      setEditPhotoPreview(URL.createObjectURL(rawFile))
      setEditPhotoRemoved(false)
    } finally {
      event.target.value = ""
    }
  }

  const handleSaveEditMaster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setEditSubmitting(true)
    setErrorMsg("")

    const costPerUnit = Number(editCostPerUnit)
    if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
      setErrorMsg("Cost per unit must be zero or greater.")
      setEditSubmitting(false)
      return
    }

    const sellingPricePerUnit = Number(editSellingPricePerUnit)
    if (!Number.isFinite(sellingPricePerUnit) || sellingPricePerUnit < 0) {
      setErrorMsg("Selling price per unit must be zero or greater.")
      setEditSubmitting(false)
      return
    }

    let imageUrl: string | null | undefined
    if (editPhotoFile) {
      const photoFormData = new FormData()
      photoFormData.append("photo", editPhotoFile)
      const uploadRes = await uploadMarketingItemPhotoAction(photoFormData)
      if (!uploadRes.success || !uploadRes.url) {
        setErrorMsg(uploadRes.error || "Failed to upload item image.")
        setEditSubmitting(false)
        return
      }
      imageUrl = uploadRes.url
    } else if (editPhotoRemoved) {
      imageUrl = null
    }

    const res = await editMarketingItemMaster(editingItem.id, {
      name: editName,
      brand: editBrand,
      category: editCategory,
      location: editLocation,
      unit: editUnit,
      pricePerUnit: costPerUnit,
      costPerUnit,
      sellingPricePerUnit,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    })

    setEditSubmitting(false)

    if (res.success && res.data) {
      triggerMessage("success", `Item master updated: ${res.data.name}!`)
      setIsEditModalOpen(false)

      setItems(prev => prev.map(i => i.id === res.data!.id ? res.data! : i))
      setEditPhotoFile(null)
      setEditPhotoPreview(null)
      setEditPhotoRemoved(false)
    } else {
      setErrorMsg(res.error || "Failed to update item master.")
    }
  }

  // Handle Delete Item
  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All associated stock logs will be removed.`)) {
      return
    }

    const res = await deleteMarketingItem(itemId)
    if (res.success) {
      triggerMessage("success", `Item "${name}" deleted.`)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } else {
      triggerMessage("error", res.error || "Failed to delete item.")
    }
  }

  // Fetch Report
  const handleGenerateReport = async (overrideFilters?: {
    startDate?: string
    endDate?: string
    category?: string
    type?: string
    search?: string
  }) => {
    setLoadingReport(true)
    const activeStart = overrideFilters?.startDate !== undefined ? overrideFilters.startDate : reportStartDate
    const activeEnd = overrideFilters?.endDate !== undefined ? overrideFilters.endDate : reportEndDate
    const activeCat = overrideFilters?.category !== undefined ? overrideFilters.category : reportCategory
    const activeType = overrideFilters?.type !== undefined ? overrideFilters.type : reportType
    const activeSearch = overrideFilters?.search !== undefined ? overrideFilters.search : reportSearch

    const res = await getMarketingStockReport({
      startDate: activeStart || undefined,
      endDate: activeEnd || undefined,
      category: activeCat !== "ALL" ? activeCat : undefined,
      type: activeType !== "ALL" ? activeType : undefined,
      search: activeSearch || undefined,
    })
    setLoadingReport(false)

    if (res.success && res.data) {
      setReportLogs(res.data as any)
    } else {
      triggerMessage("error", res.error || "Failed to fetch report.")
    }
  }

  const handleResetReportFilters = () => {
    setReportStartDate("")
    setReportEndDate("")
    setReportCategory("ALL")
    setReportType("ALL")
    setReportSearch("")
    handleGenerateReport({
      startDate: "",
      endDate: "",
      category: "ALL",
      type: "ALL",
      search: "",
    })
  }

  const handleExportExcel = async () => {
    if (reportLogs.length === 0) {
      triggerMessage("error", "No stock movement records to export.")
      return
    }
    setExportingExcel(true)
    try {
      await exportMarketingStockMovementExcel(reportLogs as any, {
        startDate: reportStartDate,
        endDate: reportEndDate,
        type: reportType,
        searchTerm: reportSearch,
      })
      triggerMessage("success", "Excel report downloaded successfully!")
    } catch (err: any) {
      console.error(err)
      triggerMessage("error", err?.message || "Failed to generate Excel report.")
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    if (reportLogs.length === 0) {
      triggerMessage("error", "No stock movement records to export.")
      return
    }
    setExportingPdf(true)
    try {
      await generateMarketingStockMovementPdf(reportLogs as any, {
        startDate: reportStartDate,
        endDate: reportEndDate,
        type: reportType,
        category: reportCategory,
        searchTerm: reportSearch,
      })
      triggerMessage("success", "PDF report downloaded successfully!")
    } catch (err: any) {
      console.error(err)
      triggerMessage("error", err?.message || "Failed to generate PDF report.")
    } finally {
      setExportingPdf(false)
    }
  }

  // Print Report (Generates the exact same Level 4 PDF and triggers the print dialog)
  const handlePrintReport = async () => {
    if (reportLogs.length === 0) {
      triggerMessage("error", "No stock movement records to print.")
      return
    }
    setExportingPdf(true)
    try {
      await generateMarketingStockMovementPdf(reportLogs as any, {
        startDate: reportStartDate,
        endDate: reportEndDate,
        type: reportType,
        category: reportCategory,
        searchTerm: reportSearch,
        autoPrint: true,
      })
    } catch (err: any) {
      console.error(err)
      // Fallback to browser window.print() if autoPrint fails
      const originalTitle = document.title
      document.title = `Marketing_Stock_Report_${new Date().toISOString().split('T')[0]}`
      window.print()
      document.title = originalTitle
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16 print:bg-white print:min-h-0 print:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 print:p-0 print:max-w-none">
        
        {/* Nav Header Tabs */}
        <div className="print:hidden">
          <MarketingNavTabs userModules={userModules} isSuperAdmin={isSuperAdmin} />
        </div>

        {/* Global Toast Alerts */}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in print:hidden">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="p-1 hover:bg-red-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in print:hidden">
            <div className="flex items-center gap-2">
              <PackageOpen className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="p-1 hover:bg-emerald-100 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Printable Report View (Visible only during printing) */}
        <div className="hidden print:block font-sans text-black">
          <div className="w-full bg-white mb-6">
            <table className="w-full border-collapse border-2 border-black text-[11px] text-black font-sans bg-white">
              <tbody>
                <tr>
                  <td className="border-2 border-black p-2 text-center w-[20%] align-middle" rowSpan={2}>
                    <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2 Logo" className="h-10 mx-auto object-contain" />
                    <div className="text-[9px] mt-2 font-medium text-gray-700">
                      Co. No. 201601013208<br />(1184139-H)
                    </div>
                  </td>
                  <td className="border-2 border-black p-2 text-center font-bold w-[30%]">
                    Document Type: Level 4<br />SUPPORTING DOCUMENTATION
                  </td>
                  <td className="border-2 border-black p-2 text-center font-bold w-[25%] uppercase">
                    Document Title:<br />MARKETING STOCK MOVEMENT REPORT
                  </td>
                  <td className="border-2 border-black p-2 text-center font-bold w-[25%]">
                    Document Number:<br />BOSB-MKT-LOG-{new Date().getFullYear()}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="border-2 border-black p-2 text-center font-bold uppercase align-middle">
                    HEAD OF MARKETING DEPARTMENT<br />
                    BUBBLES O2 SDN BHD (BOSB)
                  </td>
                  <td className="border-2 border-black p-0 align-top">
                    <table className="w-full h-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="p-1 pl-2 font-bold border-b border-black">Page: <span className="font-normal ml-1">1 of 1</span></td>
                        </tr>
                        <tr>
                          <td className="p-1 pl-2 font-bold border-b border-black">Category: <span className="font-normal ml-1">{reportCategory === "ALL" ? "All Categories" : reportCategory}</span></td>
                        </tr>
                        <tr>
                          <td className="p-1 pl-2 font-bold">Date: <span className="font-normal ml-1">{new Date().toLocaleDateString("en-GB")}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Period info if filtered */}
          {(reportStartDate || reportEndDate || reportCategory !== "ALL") && (
            <div className="mb-4 text-xs font-bold text-gray-700 flex justify-between">
              <div>
                Report Period: {reportStartDate ? new Date(reportStartDate).toLocaleDateString("en-GB") : "Beginning"} - {reportEndDate ? new Date(reportEndDate).toLocaleDateString("en-GB") : "Today"}
              </div>
              <div>
                Category: {reportCategory === "ALL" ? "All Categories" : reportCategory}
              </div>
            </div>
          )}
          <table className="w-full border-collapse border border-gray-400 text-xs table-fixed">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[11%]">Date &amp; Time</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[13%]">Item Name</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[8%]">Category</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[7%]">Location</th>
                <th className="border border-gray-400 p-2 text-center font-bold uppercase w-[8%]">Type</th>
                <th className="border border-gray-400 p-2 text-right font-bold uppercase w-[7%]">Quantity</th>
                <th className="border border-gray-400 p-2 text-right font-bold uppercase w-[7%]">Cost / Unit</th>
                <th className="border border-gray-400 p-2 text-right font-bold uppercase w-[8%]">Total Cost</th>
                <th className="border border-gray-400 p-2 text-right font-bold uppercase w-[7%]">Selling / Unit</th>
                <th className="border border-gray-400 p-2 text-right font-bold uppercase w-[9%]">Total Selling</th>
                <th className="border border-gray-400 p-2 text-left font-bold uppercase w-[15%]">Handled By</th>
              </tr>
            </thead>
            <tbody>
              {reportLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="border border-gray-400 p-4 text-center font-medium text-gray-500">
                    No stock logs recorded for the selected criteria.
                  </td>
                </tr>
              ) : (
                reportLogs.map((log) => {
                  const qty = Number(log.quantity) || 0
                  const costPerUnit = Number(log.costPerUnit ?? (log.item as any)?.costPerUnit ?? (log.type === "IN" ? (log.pricePerUnit ?? (log.item as any)?.pricePerUnit ?? 0) : 0))
                  const totalCost = Number(log.totalCost ?? (costPerUnit * qty))
                  const sellingPricePerUnit = Number(log.sellingPricePerUnit ?? (log.item as any)?.sellingPricePerUnit ?? (log.type === "OUT" ? (log.pricePerUnit ?? (log.item as any)?.pricePerUnit ?? 0) : ((log.item as any)?.sellingPricePerUnit ?? 0)))
                  const totalSelling = sellingPricePerUnit * qty

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="border border-gray-400 p-1.5 break-words whitespace-normal">{new Date(log.createdAt).toLocaleString("en-GB")}</td>
                      <td className="border border-gray-400 p-1.5 font-semibold break-words whitespace-normal">
                        {log.item?.name} {log.variantName ? `(${log.variantName})` : ""}
                      </td>
                      <td className="border border-gray-400 p-1.5 break-words whitespace-normal">{log.item?.category || "-"}</td>
                      <td className="border border-gray-400 p-1.5 font-semibold break-words whitespace-normal">{log.item?.location}</td>
                      <td className="border border-gray-400 p-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded font-black whitespace-nowrap inline-block text-[11px] min-w-[32px] ${
                          log.type === "IN" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="border border-gray-400 p-1.5 text-right font-semibold whitespace-nowrap">
                        {log.type === "IN" ? `+${log.quantity}` : `-${log.quantity}`} {log.item?.unit}
                      </td>
                      <td className="border border-gray-400 p-1.5 text-right whitespace-nowrap">
                        RM {costPerUnit.toFixed(2)}
                      </td>
                      <td className="border border-gray-400 p-1.5 text-right font-medium whitespace-nowrap">
                        RM {totalCost.toFixed(2)}
                      </td>
                      <td className="border border-gray-400 p-1.5 text-right whitespace-nowrap">
                        RM {sellingPricePerUnit.toFixed(2)}
                      </td>
                      <td className="border border-gray-400 p-1.5 text-right font-semibold whitespace-nowrap">
                        RM {totalSelling.toFixed(2)}
                      </td>
                      <td className="border border-gray-400 p-1.5 font-medium break-words whitespace-normal">
                        <div>{log.handledBy}</div>
                        {log.remarks && <div className="text-[10px] text-gray-500 italic mt-0.5">{log.remarks}</div>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dashboard Panels - Hidden in Print */}
        <div className="print:hidden space-y-6">

        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black uppercase tracking-wider mb-2">
              <Box className="w-3.5 h-3.5" />
              Marketing Merchandise Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              MARKETING MERCHANDISE MANAGEMENT
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wide mt-1">
              TRACK MERCHANDISE STOCK, APPROVE REQUISITIONS &amp; LOG DISPATCH
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-nowrap overflow-x-auto max-w-full pb-1 sm:pb-0">
            <Link
              href="/marketing/assets/qr"
              className="py-2.5 px-3.5 sm:px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
              title="Print Marketing Requisition QR Poster"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Print QR Poster</span>
            </Link>

            <button
              onClick={() => {
                setIsNewItem(false)
                setIsAddModalOpen(true)
              }}
              className="py-2.5 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stock (IN)</span>
            </button>

            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="py-2.5 px-3.5 sm:px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <Minus className="w-4 h-4" />
              <span>Withdraw Stock (OUT)</span>
            </button>
          </div>
        </div>

        {/* Marketing Summary Metric Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">TOTAL UNITS</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">{totalStockQty}</span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block truncate">{totalUniqueItems} unique item types</span>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Box className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-indigo-500 uppercase tracking-wider block truncate">TOTAL STOCK COST</span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block truncate">RM {totalCostValue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block truncate">Acquisition &amp; item costs</span>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Tag className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block truncate">TOTAL SELLING VALUE</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block truncate">RM {totalSellingValue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block truncate">Retail / sales value</span>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-purple-600 uppercase tracking-wider block truncate">ESTIMATED MARGIN</span>
              <span className={`text-xl sm:text-2xl font-black mt-1 block truncate ${totalEstimatedMargin >= 0 ? "text-purple-700" : "text-rose-600"}`}>
                RM {totalEstimatedMargin.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block truncate">
                {totalCostValue > 0 ? `${((totalEstimatedMargin / totalCostValue) * 100).toFixed(0)}% markup over cost` : "Sales minus total cost"}
              </span>
            </div>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <ArrowUpDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">PENDING REQUISITIONS</span>
              <span className={`text-2xl sm:text-3xl font-black mt-1 block ${pendingRequestsCount > 0 ? "text-amber-600" : "text-slate-900"}`}>{pendingRequestsCount}</span>
              <span className="text-[10px] font-bold text-slate-500 mt-0.5 block truncate">Marketing approval</span>
            </div>
            <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 ${pendingRequestsCount > 0 ? "bg-amber-50 text-amber-600 animate-pulse" : "bg-slate-100 text-slate-400"}`}>
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Section View Tabs (2 Tabs) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 flex gap-2 overflow-x-auto shadow-sm">
          <button
            onClick={() => setActiveTab("MERCHANDISE")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "MERCHANDISE"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Box className="w-4 h-4" />
            Active Marketing Merchandise
          </button>

          <button
            onClick={() => setActiveTab("REQUISITIONS")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "REQUISITIONS"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-4 h-4" />
            Department Requisitions &amp; Approvals
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: ACTIVE MARKETING MERCHANDISE */}
        {activeTab === "MERCHANDISE" && (
          <div className="space-y-6">
            {/* Action Bar for Report */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const nextState = !isReportSectionOpen
                  setIsReportSectionOpen(nextState)
                  if (nextState) handleGenerateReport()
                }}
                className={`px-4 py-2 rounded-xl border font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                  isReportSectionOpen 
                    ? "bg-slate-800 text-white border-slate-800" 
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <FileText className={`h-4 w-4 ${isReportSectionOpen ? "text-white" : "text-slate-500"}`} />
                <span>{isReportSectionOpen ? "Close Stock Movement Report" : "Generate Stock Movement Report"}</span>
              </button>
            </div>

            {/* Stock Movement Report Section (Preview, Filter, Excel & PDF Export) */}
            {isReportSectionOpen && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                {/* Section Header */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black tracking-tight text-white">Merchandise Stock Movement Report</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                          Audit Trail
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">Filter, preview, and generate PDF or Excel reports for merchandise stock movements</p>
                    </div>
                  </div>

                  {/* Export Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={exportingExcel || loadingReport || reportLogs.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Download stock movement report in Excel (.xlsx) format"
                    >
                      {exportingExcel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                      <span>{exportingExcel ? "Generating..." : "Download Excel"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={exportingPdf || loadingReport || reportLogs.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Download stock movement report in PDF (.pdf) format"
                    >
                      {exportingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                      <span>{exportingPdf ? "Generating..." : "Download PDF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintReport}
                      disabled={loadingReport || reportLogs.length === 0}
                      className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Print official report"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsReportSectionOpen(false)}
                      className="p-2 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Close Report Section"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metric Stat Summary Pills */}
                {(() => {
                  const inQty = reportLogs.filter(l => l.type === "IN").reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)
                  const outQty = reportLogs.filter(l => l.type === "OUT").reduce((sum, l) => sum + (Number(l.quantity) || 0), 0)
                  const netQty = inQty - outQty

                  const inCost = reportLogs.filter(l => l.type === "IN").reduce((sum, l) => {
                    const costPerUnit = Number(logCost(l))
                    return sum + Number(l.totalCost ?? (costPerUnit * (Number(l.quantity) || 0)))
                  }, 0)

                  const outSelling = reportLogs.filter(l => l.type === "OUT").reduce((sum, l) => {
                    const sellingPrice = Number(logSelling(l))
                    return sum + (sellingPrice * (Number(l.quantity) || 0))
                  }, 0)

                  const outCost = reportLogs.filter(l => l.type === "OUT").reduce((sum, l) => {
                    const costPerUnit = Number(logCost(l))
                    return sum + Number(l.totalCost ?? (costPerUnit * (Number(l.quantity) || 0)))
                  }, 0)

                  const netVal = inCost - outCost

                  function logCost(log: any) {
                    return log.costPerUnit ?? log.item?.costPerUnit ?? (log.type === "IN" ? (log.pricePerUnit ?? log.item?.pricePerUnit ?? 0) : 0)
                  }

                  function logSelling(log: any) {
                    return log.sellingPricePerUnit ?? log.item?.sellingPricePerUnit ?? (log.type === "OUT" ? (log.pricePerUnit ?? log.item?.pricePerUnit ?? 0) : (log.item?.sellingPricePerUnit ?? 0))
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-100">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Movement Logs</span>
                        <span className="text-lg font-black text-slate-900 mt-0.5 block">{reportLogs.length}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Recorded transactions</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Stock IN (Cost)</span>
                        <span className="text-lg font-black text-emerald-600 mt-0.5 block">+{inQty.toLocaleString()} pcs</span>
                        <span className="text-[10px] font-semibold text-emerald-700/80 block mt-0.5">Inward: RM {inCost.toFixed(2)}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Stock OUT (Selling)</span>
                        <span className="text-lg font-black text-rose-600 mt-0.5 block">-{outQty.toLocaleString()} pcs</span>
                        <span className="text-[10px] font-semibold text-rose-700/80 block mt-0.5">Dispatched: RM {outSelling.toFixed(2)}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Inventory Cost</span>
                        <span className="text-lg font-black text-blue-600 mt-0.5 block">RM {netVal.toFixed(2)}</span>
                        <span className="text-[10px] font-medium text-slate-500 block mt-0.5">Net units: {netQty > 0 ? `+${netQty}` : netQty} pcs (In − Out)</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Filter Controls Bar */}
                <div className="p-4 bg-white border-b border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Movement Type</label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-xl border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="ALL">All Types (IN &amp; OUT)</option>
                        <option value="IN">Stock IN (Inward / Restock)</option>
                        <option value="OUT">Stock OUT (Dispatched / Request)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Keyword</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={reportSearch}
                          onChange={(e) => setReportSearch(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleGenerateReport()}
                          placeholder="Item, variant, handler, remarks..."
                          className="w-full text-xs pl-8 pr-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateReport()}
                        disabled={loadingReport}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {loadingReport ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                        <span>Filter</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleResetReportFilters}
                        disabled={loadingReport}
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title="Reset Filters"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report Data Table Preview */}
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200 shadow-2xs">
                      <tr>
                        <th className="px-3 py-3">Date &amp; Time</th>
                        <th className="px-3 py-3 text-center">Type</th>
                        <th className="px-3 py-3">Item &amp; Variant</th>
                        <th className="px-3 py-3 text-right">Quantity</th>
                        <th className="px-3 py-3 text-right">Cost / Unit</th>
                        <th className="px-3 py-3 text-right">Total Cost</th>
                        <th className="px-3 py-3 text-right">Selling / Unit</th>
                        <th className="px-3 py-3 text-right">Total Selling</th>
                        <th className="px-3 py-3">Department</th>
                        <th className="px-3 py-3">Handled By</th>
                        <th className="px-3 py-3">Remarks / Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingReport ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                            <p className="font-semibold text-xs">Loading merchandise stock movements...</p>
                          </td>
                        </tr>
                      ) : reportLogs.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-slate-600 text-xs">No stock movement logs found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting your date range or search keyword</p>
                          </td>
                        </tr>
                      ) : (
                        reportLogs.map((log) => {
                          const qty = Number(log.quantity) || 0
                          const costPerUnit = Number(log.costPerUnit ?? (log.item as any)?.costPerUnit ?? (log.type === "IN" ? (log.pricePerUnit ?? (log.item as any)?.pricePerUnit ?? 0) : 0))
                          const totalCost = Number(log.totalCost ?? (costPerUnit * qty))
                          const sellingPricePerUnit = Number(log.sellingPricePerUnit ?? (log.item as any)?.sellingPricePerUnit ?? (log.type === "OUT" ? (log.pricePerUnit ?? (log.item as any)?.pricePerUnit ?? 0) : ((log.item as any)?.sellingPricePerUnit ?? 0)))
                          const totalSelling = sellingPricePerUnit * qty
                          const variantName = log.variantName || log.variant?.variantName

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                                {log.createdAt ? new Date(log.createdAt).toLocaleString("en-GB") : "-"}
                              </td>
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider inline-block min-w-[34px] ${
                                  log.type === "IN" 
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                }`}>
                                  {log.type}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className="font-bold text-slate-900">{log.item?.name}</span>
                                {variantName && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {variantName}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-black whitespace-nowrap">
                                <span className={log.type === "IN" ? "text-emerald-700" : "text-rose-700"}>
                                  {log.type === "IN" ? `+${log.quantity}` : `-${log.quantity}`} {log.item?.unit || "pcs"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-600 whitespace-nowrap">
                                RM {costPerUnit.toFixed(2)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-900 whitespace-nowrap">
                                RM {totalCost.toFixed(2)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-medium text-slate-600 whitespace-nowrap">
                                RM {sellingPricePerUnit.toFixed(2)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-blue-700 whitespace-nowrap">
                                RM {totalSelling.toFixed(2)}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 font-medium whitespace-nowrap">
                                {log.department || "MARKETING"}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                {log.handledBy}
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 max-w-xs truncate" title={log.remarks || ""}>
                                {log.remarks || "—"}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Active Merchandise Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Header & Search */}
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Active Merchandise Catalog</h2>
                  <p className="text-xs text-slate-500">Manage and track live quantities for promotional items and merchandise</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setMerchandisePage(1)
                    }}
                    placeholder="Search merchandise name or brand..."
                    className="w-full text-xs pl-9 pr-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Table (Without Category Column) */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Item Name</th>
                      <th className="px-4 py-3.5">Brand</th>
                      <th className="px-4 py-3.5">Location</th>
                      <th className="px-4 py-3.5 text-center">Current Stock</th>
                      <th className="px-3 py-3.5 text-center">Unit</th>
                      <th className="px-4 py-3.5 text-right">Cost / Unit</th>
                      <th className="px-4 py-3.5 text-right">Total Cost</th>
                      <th className="px-4 py-3.5 text-right">Selling / Unit</th>
                      <th className="px-4 py-3.5 text-right">Total Selling Price</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                          <Box className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No marketing merchandise items matching criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item) => {
                        const itemCost = item.costPerUnit !== undefined && item.costPerUnit !== null ? item.costPerUnit : (item.pricePerUnit || 0)
                        const itemTotalCost = item.quantity * itemCost
                        const itemSelling = item.sellingPricePerUnit !== undefined && item.sellingPricePerUnit !== null ? item.sellingPricePerUnit : 0
                        const itemTotalSelling = item.quantity * itemSelling

                        return (
                        <React.Fragment key={item.id}>
                          <tr className={`hover:bg-slate-50/80 transition-colors ${expandedItemIds.has(item.id) ? "bg-slate-50/60" : ""}`}>
                            {/* Name & Photo */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                    <Box className="h-4 w-4" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (item.hasVariants) {
                                          toggleExpandItem(item.id)
                                        } else {
                                          setSelectedDetailItem(item)
                                          setIsDetailModalOpen(true)
                                        }
                                      }}
                                      className="font-bold text-slate-900 hover:text-blue-600 text-left transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      {item.name}
                                      {item.hasVariants && (
                                        expandedItemIds.has(item.id) ? (
                                          <ChevronDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                        ) : (
                                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        )
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {item.id.slice(0, 8)}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDetailItem(item)
                                        setIsDetailModalOpen(true)
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-blue-600 font-medium underline cursor-pointer"
                                    >
                                      Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Brand */}
                            <td className="px-4 py-3.5 font-medium text-slate-600">
                              {item.brand || "—"}
                            </td>

                            {/* Location */}
                            <td className="px-4 py-3.5 text-slate-600 font-medium">
                              {item.location}
                            </td>

                            {/* Stock Qty */}
                            <td className="px-4 py-3.5 text-center">
                              <span className={`font-black text-sm ${item.quantity > 5 ? "text-slate-900" : item.quantity > 0 ? "text-amber-600" : "text-rose-600"}`}>
                                {item.quantity}
                              </span>
                            </td>

                            {/* Unit */}
                            <td className="px-3 py-3.5 text-slate-500 font-medium text-center">
                              {item.unit}
                            </td>

                            {/* Cost / Unit */}
                            <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700">
                              RM {itemCost.toFixed(2)}
                            </td>

                            {/* Total Cost */}
                            <td className="px-4 py-3.5 text-right font-mono font-black text-indigo-900 bg-indigo-50/30">
                              RM {itemTotalCost.toFixed(2)}
                            </td>

                            {/* Selling / Unit */}
                            <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-700">
                              RM {itemSelling.toFixed(2)}
                            </td>

                            {/* Total Selling Price */}
                            <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                              RM {itemTotalSelling.toFixed(2)}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedWithdrawItemId(item.id)
                                    setSelectedWithdrawVariantId(item.variants?.[0]?.id || "")
                                    setWithdrawQty(1)
                                    setIsWithdrawModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Withdraw (OUT)"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Edit Master"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Variants: Rendered Row by Row */}
                          {item.hasVariants && expandedItemIds.has(item.id) && item.variants && item.variants.length > 0 && (
                            item.variants.map((v, vIdx) => {
                              const vCost = v.costPerUnit !== undefined && v.costPerUnit !== null ? v.costPerUnit : (v.pricePerUnit || itemCost)
                              const vTotalCost = v.quantity * vCost
                              const vSelling = v.sellingPricePerUnit !== undefined && v.sellingPricePerUnit !== null ? v.sellingPricePerUnit : itemSelling
                              const vTotalSelling = v.quantity * vSelling

                              return (
                                <tr 
                                  key={v.id} 
                                  className="bg-slate-50/70 hover:bg-indigo-50/40 border-t border-slate-100 transition-colors"
                                >
                                  {/* Name & Tree Branch */}
                                  <td className="px-5 py-2.5 pl-14">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-slate-300 font-mono text-sm select-none">
                                        {vIdx === item.variants!.length - 1 ? "└─" : "├─"}
                                      </span>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-800 text-xs">
                                            {v.variantName}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            Variant
                                          </span>
                                        </div>
                                        {v.sku && (
                                          <span className="block text-[10px] text-slate-400 font-mono">
                                            SKU: {v.sku}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Brand */}
                                  <td className="px-4 py-2.5 text-slate-400 font-medium text-xs">
                                    {item.brand || "—"}
                                  </td>

                                  {/* Location */}
                                  <td className="px-4 py-2.5 text-slate-500 font-medium text-xs">
                                    {item.location}
                                  </td>

                                  {/* Stock Qty */}
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`font-black text-sm ${v.quantity > 5 ? "text-slate-900" : v.quantity > 0 ? "text-amber-600" : "text-rose-600"}`}>
                                      {v.quantity}
                                    </span>
                                  </td>

                                  {/* Unit */}
                                  <td className="px-3 py-2.5 text-slate-500 font-medium text-xs text-center">
                                    {item.unit}
                                  </td>

                                  {/* Cost / Unit */}
                                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700 text-xs">
                                    RM {vCost.toFixed(2)}
                                  </td>

                                  {/* Total Cost */}
                                  <td className="px-4 py-2.5 text-right font-mono font-black text-indigo-900 bg-indigo-50/30 text-xs">
                                    RM {vTotalCost.toFixed(2)}
                                  </td>

                                  {/* Selling / Unit */}
                                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700 text-xs">
                                    RM {vSelling.toFixed(2)}
                                  </td>

                                  {/* Total Selling Price */}
                                  <td className="px-4 py-2.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/40 text-xs">
                                    RM {vTotalSelling.toFixed(2)}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-5 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedWithdrawItemId(item.id)
                                          setSelectedWithdrawVariantId(v.id)
                                          setWithdrawQty(1)
                                          setIsWithdrawModalOpen(true)
                                        }}
                                        className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                                        title={`Withdraw (OUT) ${v.variantName}`}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </React.Fragment>
                      )
                    })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {filteredItems.length > 0 && (
                <TablePagination
                  currentPage={merchandisePage}
                  totalItems={filteredItems.length}
                  pageSize={merchandisePageSize}
                  onPageChange={setMerchandisePage}
                  onPageSizeChange={setMerchandisePageSize}
                  pageSizeOptions={[10, 20, 50]}
                  itemName="merchandise items"
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEPARTMENT REQUISITIONS */}
        {activeTab === "REQUISITIONS" && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto">
                {["ALL", "PENDING", "DISPATCHED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setReqFilterStatus(st)
                      setRequisitionsPage(1)
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                      reqFilterStatus === st
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st === "ALL" ? "ALL REQUESTS" : st}
                    {st === "PENDING" && pendingRequestsCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <span className="text-xs font-bold text-slate-400">
                Showing {filteredRequests.length} request(s)
              </span>
            </div>

            {/* Requisitions Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">REQ NO / DATE</th>
                      <th className="py-3.5 px-4">MERCHANDISE ITEM</th>
                      <th className="py-3.5 px-4">REQUESTER</th>
                      <th className="py-3.5 px-4">PURPOSE &amp; PICKUP</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-4 text-right">MARKETING ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-4 text-center text-slate-400">
                          <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-600">No merchandise requisitions found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Staff can scan the QR poster to submit merchandise requests.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedRequests.map((req: any) => (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-slate-900">
                            <div>{req.requestNumber}</div>
                            <span className="text-[10px] font-normal text-slate-400 font-sans">
                              {new Date(req.createdAt).toLocaleDateString("en-MY")}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              {req.item?.imageUrl ? (
                                <img
                                  src={req.item.imageUrl}
                                  alt={req.item.name}
                                  className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                                  <Box className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <span className="font-black text-slate-800 block">
                                  {req.item?.name || "Merchandise"}
                                </span>
                                {req.variantName && (
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    Variant: {req.variantName}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-indigo-600 block mt-0.5">
                                  Qty: {req.quantity} {req.item?.unit || "pcs"} • Available: {req.variant ? req.variant.quantity : (req.item?.quantity ?? 0)} in store
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-800 block">
                              {req.requesterName} {req.requesterStaffId && <span className="text-[10px] text-slate-400 font-mono font-normal">({req.requesterStaffId})</span>}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {req.requesterDepartment} {req.requesterPhone && `• ${req.requesterPhone}`}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-800 block">
                              Pickup: {new Date(req.pickupDate).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <span className="text-[10px] text-slate-500 block line-clamp-1" title={req.purpose}>
                              {req.purpose}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            {req.status === "PENDING" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                PENDING
                              </span>
                            )}
                            {req.status === "DISPATCHED" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                DISPATCHED
                              </span>
                            )}
                            {req.status === "REJECTED" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                REJECTED
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(req)}
                                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={approvingReqId === req.id}
                                  onClick={() => handleApproveMerchReq(req.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                  {approvingReqId === req.id ? "Dispensing..." : "Approve & Dispense"}
                                </button>
                              </div>
                            ) : req.status === "DISPATCHED" ? (
                              <div className="text-right">
                                <span className="text-[11px] font-bold text-emerald-700 block">Dispensed</span>
                                <span className="text-[10px] text-slate-400 block">{req.dispatchedBy || "Storekeeper"}</span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className="text-[11px] font-bold text-rose-700 block">Rejected</span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[140px]" title={req.rejectionReason || ""}>{req.rejectionReason || "Declined"}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {filteredRequests.length > 0 && (
                <TablePagination
                  currentPage={requisitionsPage}
                  totalItems={filteredRequests.length}
                  pageSize={requisitionsPageSize}
                  onPageChange={setRequisitionsPage}
                  onPageSizeChange={setRequisitionsPageSize}
                  pageSizeOptions={[10, 20, 50]}
                  itemName="requisitions"
                />
              )}
            </div>
          </div>
        )}

      </div>

      {/* Requisitions Review Modal */}
      {isRequisitionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Department Merchandise Requisitions</h3>
                <p className="text-xs text-slate-500">Review, approve, and dispense merchandise requested by other departments via QR</p>
              </div>
              <button onClick={() => setIsRequisitionsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingRequests ? (
              <div className="py-12 text-center text-xs text-slate-400 font-bold">Loading department requisitions...</div>
            ) : merchandiseRequests.length === 0 ? (
              <div className="py-12 text-center">
                <PackageOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No merchandise requisitions found</p>
                <p className="text-xs text-slate-400 mt-1">Staff can scan the QR code to request items.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {merchandiseRequests.map((req: any) => (
                  <div key={req.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                          {req.requestNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600">
                          Dept: <strong className="text-slate-900">{req.requesterDepartment}</strong>
                        </span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        req.status === "PENDING"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : req.status === "DISPATCHED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-rose-100 text-rose-800 border-rose-300"
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Requester:</span>
                        <span className="font-bold text-slate-800">{req.requesterName}</span>
                        <span className="text-[11px] text-slate-500 block">ID: {req.requesterStaffId || "-"} • {req.requesterPhone}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Item Requested:</span>
                        <span className="font-black text-slate-900">{req.item?.name || "Item"}</span>
                        <span className="text-[11px] text-indigo-600 font-bold block">
                          Qty: {req.quantity} {req.item?.unit || "pcs"} (Available: {req.item?.quantity ?? "?"})
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Scheduled Pickup:</span>
                        <span className="font-bold text-slate-800">
                          {new Date(req.pickupDate).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate" title={req.purpose}>
                          Purpose: {req.purpose}
                        </span>
                      </div>
                    </div>

                    {req.status === "PENDING" && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(req)}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={approvingReqId === req.id}
                          onClick={() => handleApproveMerchReq(req.id)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {approvingReqId === req.id ? "Dispensing..." : "Approve & Dispense (Stock OUT)"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Add Marketing Stock (IN)</h3>
                <p className="text-xs text-slate-500">Restock existing item or register a new marketing asset</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStock} className="space-y-4">
              {/* Type Toggle */}
              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsNewItem(false)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${!isNewItem ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  Restock Existing Item
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewItem(true)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${isNewItem ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                  + New Marketing Item
                </button>
              </div>

              {!isNewItem ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Choose Existing Item *</label>
                  <select
                    required
                    value={selectedAddItemId}
                    onChange={(e) => {
                      const id = e.target.value
                      setSelectedAddItemId(id)
                      setSelectedRestockVariantId("")
                      const it = items.find(i => i.id === id)
                      if (it && it.sellingPricePerUnit !== undefined && it.sellingPricePerUnit !== null && it.sellingPricePerUnit > 0) {
                        setAddSellingPricePerUnit(String(it.sellingPricePerUnit))
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">-- Select Marketing Item --</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.category || "MERCHANDISE"}) - Current Stock: {i.quantity} {i.unit}
                      </option>
                    ))}
                  </select>

                  {selectedAddItem?.hasVariants && selectedAddItem.variants && selectedAddItem.variants.length > 0 && (
                    <div className="mt-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                      <label className="block text-xs font-bold uppercase text-indigo-900 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Select Variant to Restock *
                      </label>
                      <select
                        required
                        value={selectedRestockVariantId}
                        onChange={(e) => setSelectedRestockVariantId(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-indigo-200 bg-white font-medium"
                      >
                        <option value="">-- Choose Variant --</option>
                        {selectedAddItem.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.variantName} (Current: {v.quantity} {selectedAddItem.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. BUBBLESO2 BRANDED T-SHIRT (SIZE L)"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Brand / Vendor</label>
                      <input
                        type="text"
                        value={addBrand}
                        onChange={(e) => setAddBrand(e.target.value)}
                        placeholder="e.g. Bubbles O2"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category</label>
                      <select
                        value={addCategory}
                        onChange={(e) => setAddCategory(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {CATEGORIES.filter(c => c.id !== "ALL").map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Location</label>
                      <select
                        value={addLocation}
                        onChange={(e) => setAddLocation(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {LOCATIONS.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={addUnit}
                        onChange={(e) => setAddUnit(e.target.value)}
                        placeholder="pcs, boxes, sets"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Variant toggle & builder */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={addHasVariants}
                        onChange={(e) => setAddHasVariants(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Has Multiple Sizes, Colors, or Custom Attributes
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Enable to define attributes and individual stock per variant
                        </span>
                      </div>
                    </label>

                    {addHasVariants && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        {/* Dynamic Attributes Builder */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                              Define Attributes &amp; Options
                            </span>
                            <span className="text-[10px] text-slate-400">
                              e.g. Size, Color, Edition
                            </span>
                          </div>

                          {/* Existing Attributes */}
                          {addAttributes.map((attr, attrIdx) => (
                            <div key={attrIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                  <Tag className="w-3 h-3 text-indigo-600" />
                                  {attr.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttribute(attrIdx)}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>

                              {/* Options Chips */}
                              <div className="flex flex-wrap gap-1.5">
                                {attr.options.map((opt) => (
                                  <span
                                    key={opt}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
                                  >
                                    {opt}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionFromAttribute(attrIdx, opt)}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>

                              {/* Add Option Input */}
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={newAttrOptionInputs[attrIdx] || ""}
                                  onChange={(e) => setNewAttrOptionInputs(prev => ({ ...prev, [attrIdx]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      handleAddOptionToAttribute(attrIdx)
                                    }
                                  }}
                                  placeholder={`Add options (e.g. Collar, Round Neck) & press Enter`}
                                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddOptionToAttribute(attrIdx)}
                                  className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                >
                                  + Add
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Add New Attribute Name */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newAttrName}
                              onChange={(e) => setNewAttrName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleAddAttribute()
                                }
                              }}
                              placeholder="New Attribute Name (e.g. Size, Color)"
                              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={handleAddAttribute}
                              className="px-3 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer"
                            >
                              + Add Attribute
                            </button>
                          </div>
                        </div>

                        {/* Variant Matrix Table */}
                        {variantMatrix.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                Generated Variants ({variantMatrix.length})
                              </span>
                              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                Total Qty: {totalVariantQty}
                              </span>
                            </div>

                            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                              {variantMatrix.map((v, idx) => (
                                <div key={idx} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 text-xs">
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-slate-900 block truncate">{v.variantName}</span>
                                    <input
                                      type="text"
                                      placeholder="SKU / Barcode (Optional)"
                                      value={v.sku}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        setVariantMatrix(prev => {
                                          const copy = [...prev]
                                          copy[idx] = { ...copy[idx], sku: val }
                                          return copy
                                        })
                                      }}
                                      className="mt-1 text-[11px] px-2 py-0.5 rounded border border-slate-200 w-full font-mono text-slate-600"
                                    />
                                  </div>
                                  <div className="w-24 shrink-0">
                                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Initial Stock</label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={v.quantity}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0
                                        setVariantMatrix(prev => {
                                          const copy = [...prev]
                                          copy[idx] = { ...copy[idx], quantity: val }
                                          return copy
                                        })
                                      }}
                                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 font-black text-center"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Item Image (Optional)</label>
                <div className="rounded-2xl border border-dashed border-slate-300 p-3 bg-slate-50/50 space-y-2.5">
                  {addPhotoDisplayUrl && (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                      <img src={addPhotoDisplayUrl} alt="Marketing item preview" className="h-14 w-14 rounded-lg border border-slate-200 object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {addPhotoFile?.name || (!isNewItem && selectedAddItem?.imageUrl ? "Current item image" : "Selected photo")}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          {addPhotoFile ? `${(addPhotoFile.size / 1024).toFixed(0)} KB • Ready to upload` : "Attached to item"}
                        </p>
                      </div>
                      {(addPhotoFile || (!isNewItem && selectedAddItem?.imageUrl)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddPhotoFile(null)
                            setAddPhotoPreview(null)
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                      <Camera className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Take Photo (Camera)</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleAddPhotoChange}
                      />
                    </label>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                      <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAddPhotoChange}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Auto-compressed for mobile upload &bull; Supports direct camera or gallery selection
                  </p>
                </div>
              </div>

              {/* Quantity, Total Cost & Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Quantity (IN) * {isNewItem && addHasVariants && <span className="text-indigo-600 text-[10px] font-normal lowercase">(sum of variants)</span>}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    readOnly={isNewItem && addHasVariants}
                    value={isNewItem && addHasVariants ? totalVariantQty : addQty}
                    onChange={(e) => setAddQty(Number(e.target.value))}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold ${isNewItem && addHasVariants ? "bg-slate-100 text-slate-600 cursor-not-allowed" : ""}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Total Cost (RM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={addTotalPrice}
                    onChange={(e) => setAddTotalPrice(e.target.value)}
                    placeholder="e.g. 250.00"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Selling / Unit (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addSellingPricePerUnit}
                    onChange={(e) => setAddSellingPricePerUnit(e.target.value)}
                    placeholder="e.g. 25.00"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Live Cost vs Selling Auto-Calculations */}
              {(() => {
                const currentQty = isNewItem && addHasVariants ? totalVariantQty : Number(addQty || 0)
                const currentTotalCost = parseFloat(addTotalPrice) || 0
                const currentSellingUnit = parseFloat(addSellingPricePerUnit) || 0
                const currentUnitCost = currentQty > 0 && currentTotalCost > 0 ? (currentTotalCost / currentQty) : 0
                const currentTotalSelling = currentQty * currentSellingUnit
                const currentMargin = currentTotalSelling - currentTotalCost

                if (currentQty <= 0 && currentTotalCost <= 0) return null

                return (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Unit Cost</span>
                      <span className="font-mono font-bold text-indigo-900">
                        RM {currentUnitCost.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Selling</span>
                      <span className="font-mono font-bold text-emerald-700">
                        RM {currentTotalSelling.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Margin</span>
                      <span className={`font-mono font-bold ${currentMargin >= 0 ? "text-purple-700" : "text-rose-600"}`}>
                        RM {currentMargin.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* Handled By & Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Handled By *</label>
                <input
                  type="text"
                  required
                  value={addHandledBy}
                  onChange={(e) => setAddHandledBy(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Remarks / Supplier Note</label>
                <input
                  type="text"
                  value={addRemarks}
                  onChange={(e) => setAddRemarks(e.target.value)}
                  placeholder="e.g. Received from vendor for Event Launching"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  {submitting ? "Logging Stock..." : "+ Confirm Stock In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Stock Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-rose-600 uppercase">Withdraw Marketing Stock (OUT)</h3>
                <p className="text-xs text-slate-500">Record asset usage, event checkout, or promotional distribution</p>
              </div>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Select Marketing Item *</label>
                <select
                  required
                  value={selectedWithdrawItemId}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedWithdrawItemId(id)
                    const found = items.find(i => i.id === id)
                    setSelectedWithdrawVariantId(found?.variants?.[0]?.id || "")
                  }}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- Choose Item --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.category || "MERCHANDISE"}) — Available: {i.quantity} {i.unit}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const selectedWithdrawItem = items.find(i => i.id === selectedWithdrawItemId)
                const selectedWithdrawVariant = selectedWithdrawItem?.variants?.find(v => v.id === selectedWithdrawVariantId)
                const maxStock = selectedWithdrawVariant ? selectedWithdrawVariant.quantity : (selectedWithdrawItem?.quantity || 1)

                return (
                  <>
                    {selectedWithdrawItem?.hasVariants && selectedWithdrawItem.variants && selectedWithdrawItem.variants.length > 0 && (
                      <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                        <label className="block text-xs font-bold uppercase text-rose-900 mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                          Select Variant to Withdraw *
                        </label>
                        <select
                          required
                          value={selectedWithdrawVariantId}
                          onChange={(e) => setSelectedWithdrawVariantId(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-rose-200 bg-white font-medium"
                        >
                          <option value="">-- Choose Variant --</option>
                          {selectedWithdrawItem.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.variantName} (Available: {v.quantity} {selectedWithdrawItem.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase text-slate-700">Withdraw Quantity *</label>
                        {selectedWithdrawItem && (
                          <span className="text-[10px] text-slate-500 font-bold">
                            Available: {selectedWithdrawVariant ? `${selectedWithdrawVariant.quantity} ${selectedWithdrawItem.unit}` : `${selectedWithdrawItem.quantity} ${selectedWithdrawItem.unit}`}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={maxStock > 0 ? maxStock : undefined}
                        required
                        value={withdrawQty}
                        onChange={(e) => setWithdrawQty(Number(e.target.value))}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold"
                      />
                    </div>
                  </>
                )
              })()}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Handled By *</label>
                <input
                  type="text"
                  required
                  value={withdrawHandledBy}
                  onChange={(e) => setWithdrawHandledBy(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Purpose / Event Name / Remarks</label>
                <textarea
                  rows={2}
                  value={withdrawRemarks}
                  onChange={(e) => setWithdrawRemarks(e.target.value)}
                  placeholder="e.g. Distributed at KL Marathon 2026 Booth"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                >
                  {submitting ? "Withdrawing..." : "— Confirm Withdrawal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Master Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-black text-slate-900 uppercase">Edit Item Master</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMaster} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Item Image</label>
                <div className="rounded-2xl border border-dashed border-slate-300 p-3 bg-slate-50/50 space-y-2.5">
                  {(editPhotoPreview || (!editPhotoRemoved && editingItem.imageUrl)) && (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200">
                      <img
                        src={editPhotoPreview || editingItem.imageUrl || ""}
                        alt={editingItem.name}
                        className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {editPhotoFile?.name || "Current item image"}
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          {editPhotoFile ? `${(editPhotoFile.size / 1024).toFixed(0)} KB • Ready to upload` : "Current master image"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPhotoFile(null)
                          setEditPhotoPreview(null)
                          setEditPhotoRemoved(true)
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                      <Camera className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Take Photo (Camera)</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleEditPhotoChange}
                      />
                    </label>
                    <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-blue-50/40 transition-all shadow-xs">
                      <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditPhotoChange}
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Auto-compressed for mobile upload &bull; Supports direct camera or gallery selection
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {CATEGORIES.filter(c => c.id !== "ALL").map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Location</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {LOCATIONS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Cost / Unit (RM) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    required
                    value={editCostPerUnit}
                    onChange={(e) => {
                      setEditCostPerUnit(e.target.value)
                      setEditPricePerUnit(e.target.value)
                    }}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Selling Price / Unit (RM)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editSellingPricePerUnit}
                    onChange={(e) => setEditSellingPricePerUnit(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Total preview in Edit Modal */}
              {editingItem && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-3 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Stock Cost</span>
                    <span className="font-mono font-bold text-indigo-900">
                      RM {(editingItem.quantity * Number(editCostPerUnit || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Selling Value</span>
                    <span className="font-mono font-bold text-emerald-700">
                      RM {(editingItem.quantity * Number(editSellingPricePerUnit || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-1/2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  {editSubmitting ? "Saving..." : "Save Master Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Ledger Modal */}
      {isDetailModalOpen && selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex min-w-0 items-center gap-4">
                {selectedDetailItem.imageUrl ? (
                  <img
                    src={selectedDetailItem.imageUrl}
                    alt={selectedDetailItem.name}
                    className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400 sm:h-24 sm:w-24">
                    <ImageIcon className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                    {selectedDetailItem.category || "MERCHANDISE"}
                  </span>
                  <h3 className="mt-1 break-words text-xl font-black text-slate-900">{selectedDetailItem.name}</h3>
                  <p className="text-xs text-slate-500">Location: {selectedDetailItem.location} • Brand: {selectedDetailItem.brand || "N/A"}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {(() => {
              const dCost = selectedDetailItem.costPerUnit !== undefined && selectedDetailItem.costPerUnit !== null 
                ? selectedDetailItem.costPerUnit 
                : (selectedDetailItem.pricePerUnit || 0)
              const dTotalCost = selectedDetailItem.quantity * dCost
              const dSelling = selectedDetailItem.sellingPricePerUnit !== undefined && selectedDetailItem.sellingPricePerUnit !== null
                ? selectedDetailItem.sellingPricePerUnit
                : 0
              const dTotalSelling = selectedDetailItem.quantity * dSelling
              const dMargin = dTotalSelling - dTotalCost

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Current Stock</span>
                    <span className="text-lg font-black text-slate-900">{selectedDetailItem.quantity} {selectedDetailItem.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Cost / Unit</span>
                    <span className="text-lg font-black text-indigo-900">RM {dCost.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">Total: RM {dTotalCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Selling / Unit</span>
                    <span className="text-lg font-black text-emerald-700">RM {dSelling.toFixed(2)}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">Total: RM {dTotalSelling.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Projected Margin</span>
                    <span className={`text-lg font-black ${dMargin >= 0 ? "text-purple-700" : "text-rose-600"}`}>
                      RM {dMargin.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Potential profit</span>
                  </div>
                </div>
              )
            })()}

            {selectedDetailItem.hasVariants && selectedDetailItem.variants && selectedDetailItem.variants.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Variant Breakdown ({selectedDetailItem.variants.length} types)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Total: <strong className="text-slate-900">{selectedDetailItem.quantity} {selectedDetailItem.unit}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedDetailItem.variants.map((v) => (
                    <div key={v.id} className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                      <div className="font-bold text-slate-900 truncate">{v.variantName}</div>
                      {v.sku && <div className="text-[10px] font-mono text-slate-400">SKU: {v.sku}</div>}
                      <div className={`mt-1 text-xs font-black ${v.quantity > 5 ? "text-slate-800" : v.quantity > 0 ? "text-amber-600" : "text-rose-600"}`}>
                        {v.quantity} {selectedDetailItem.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Stock Movement History</h4>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase sticky top-0">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Variant</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Handled By</th>
                      <th className="px-4 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.filter(l => l.itemId === selectedDetailItem.id).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No stock logs for this item.</td>
                      </tr>
                    ) : (
                      logs.filter(l => l.itemId === selectedDetailItem.id).map(log => (
                        <tr key={log.id}>
                          <td className="px-4 py-2 text-slate-500">{new Date(log.createdAt).toLocaleDateString("en-GB")}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === "IN" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-700 font-semibold text-[11px]">
                            {log.variantName ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                                {log.variantName}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-2 font-bold">{log.quantity}</td>
                          <td className="px-4 py-2 text-slate-700">{log.handledBy}</td>
                          <td className="px-4 py-2 text-slate-500 italic">{log.remarks || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Merchandise Requisition Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reject Merchandise Requisition</h3>
                <p className="text-xs text-slate-500 font-mono">{rejectingReq.requestNumber || rejectingReq.id?.slice(0, 8)}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmRejectMerchReq} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Rejection *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide reason (e.g. Asset scheduled for another event, insufficient stock)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingReq(null)
                    setRejectionReason("")
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isRejecting ? "Rejecting..." : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  )
}
