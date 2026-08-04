"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import {
  deleteMaintenanceDraft,
  getMaintenanceDraft,
  saveMaintenanceDraft,
} from "@/app/actions/maintenance-drafts"

export type MaintenanceDraftController<T> = {
  /** A draft found on the server, waiting for the user to accept it. Never applied automatically. */
  pendingDraft: { payload: T; updatedAt: Date } | null
  isLoading: boolean
  isSaving: boolean
  savedAt: Date | null
  error: string
  /** Persist the current form state as this user's draft for this form. */
  saveDraft: () => Promise<void>
  /** Apply the pending draft to the form and dismiss the banner. */
  restoreDraft: () => void
  /** Throw the draft away (user pressed "Discard"). */
  discardDraft: () => Promise<void>
  /** Silently remove the draft — call after a successful submit. */
  clearDraft: () => Promise<void>
}

/**
 * Save-as-draft for the GMP forms under /forms/maintenance.
 *
 * `values()` should return everything the form needs to resume EXCEPT signatures:
 * a signature is an attestation made at submit time, and SignaturePadClient (shared
 * with Production/Warehouse) has no way to restore a drawing into its canvas.
 *
 * A found draft is surfaced through `pendingDraft` rather than applied on mount —
 * these forms default `date` to today, and silently overwriting that is confusing.
 */
export function useMaintenanceDraft<T>(
  formType: string,
  opts: { values: () => T; apply: (values: T) => void }
): MaintenanceDraftController<T> {
  const [pendingDraft, setPendingDraft] = useState<{ payload: T; updatedAt: Date } | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(formType))
  const [isSaving, setIsSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState("")

  // Keep the latest closures without re-running the load effect on every render.
  const optsRef = useRef(opts)
  useEffect(() => {
    optsRef.current = opts
  })

  useEffect(() => {
    if (!formType) return
    let cancelled = false

    getMaintenanceDraft(formType)
      .then(res => {
        if (cancelled) return
        if (res.success && res.data) {
          setPendingDraft({ payload: res.data.payload as T, updatedAt: new Date(res.data.updatedAt) })
        } else {
          setPendingDraft(null)
        }
      })
      .catch(() => {
        // A failed draft lookup must never block the form itself.
        if (!cancelled) setPendingDraft(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [formType])

  const saveDraft = useCallback(async () => {
    if (!formType) return
    setIsSaving(true)
    setError("")
    try {
      const res = await saveMaintenanceDraft(formType, optsRef.current.values())
      if (res.success && res.data) {
        setSavedAt(new Date(res.data.updatedAt))
        setPendingDraft(null)
      } else {
        setError(res.error || "Failed to save draft.")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save draft.")
    } finally {
      setIsSaving(false)
    }
  }, [formType])

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return
    optsRef.current.apply(pendingDraft.payload)
    setSavedAt(pendingDraft.updatedAt)
    setPendingDraft(null)
  }, [pendingDraft])

  const discardDraft = useCallback(async () => {
    if (!formType) return
    setPendingDraft(null)
    setSavedAt(null)
    await deleteMaintenanceDraft(formType)
  }, [formType])

  const clearDraft = useCallback(async () => {
    if (!formType) return
    setPendingDraft(null)
    setSavedAt(null)
    await deleteMaintenanceDraft(formType)
  }, [formType])

  return { pendingDraft, isLoading, isSaving, savedAt, error, saveDraft, restoreDraft, discardDraft, clearDraft }
}

// ---------------------------------------------------------------------------------------------
// Uncontrolled <form> variant
//
// Nine of the GMP forms are plain uncontrolled forms read via `new FormData(e.currentTarget)`
// (chemical-control, cleaning, finished-goods, food-handler, ftdm, lighting, pcdm,
// waste-disposal, waste-management). They hold no field state to snapshot, so the draft is
// taken straight off the DOM instead of rewriting them as controlled components.
// ---------------------------------------------------------------------------------------------

export type FormValues = Record<string, string | boolean>

const SKIPPED_INPUT_TYPES = new Set(["submit", "button", "reset", "file", "password", "image"])

/** Snapshot every named field of a form. Checkbox names are unique per form here, so name-keying is safe. */
export function readFormValues(form: HTMLFormElement | null): FormValues {
  const values: FormValues = {}
  if (!form) return values

  for (const element of Array.from(form.elements)) {
    const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!field.name) continue

    const type = (field as HTMLInputElement).type
    if (SKIPPED_INPUT_TYPES.has(type)) continue

    if (type === "checkbox") {
      values[field.name] = (field as HTMLInputElement).checked
    } else {
      values[field.name] = field.value
    }
  }

  return values
}

/** Write a snapshot back onto an uncontrolled form. Unknown/removed fields are ignored. */
export function applyFormValues(form: HTMLFormElement | null, values: FormValues) {
  if (!form || !values) return

  for (const element of Array.from(form.elements)) {
    const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!field.name || !(field.name in values)) continue

    const type = (field as HTMLInputElement).type
    if (SKIPPED_INPUT_TYPES.has(type)) continue

    const value = values[field.name]
    if (type === "checkbox") {
      ;(field as HTMLInputElement).checked = value === true
    } else if (typeof value === "string") {
      field.value = value
    }
  }
}

/** Save-as-draft for an uncontrolled `<form>`; pass a ref attached to the form element. */
export function useMaintenanceFormElementDraft(
  formType: string,
  formRef: RefObject<HTMLFormElement | null>
): MaintenanceDraftController<FormValues> {
  return useMaintenanceDraft<FormValues>(formType, {
    values: () => readFormValues(formRef.current),
    apply: (values) => applyFormValues(formRef.current, values),
  })
}
