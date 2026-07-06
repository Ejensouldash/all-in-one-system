"use server"

import { createClient } from "@supabase/supabase-js"

// Use the Service Role Key for server-side admin tasks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const bucketName = "system-backups"

export async function getSystemBackups() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: "Missing Supabase configuration." }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase.storage.from(bucketName).list()

    if (error) {
      console.error("Error listing backups:", error)
      return { success: false, error: error.message }
    }

    // Filter only .sql.gz files and sort by newest first
    const backups = data
      .filter(file => file.name.endsWith(".sql.gz"))
      .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())

    return { success: true, data: backups }
  } catch (error: any) {
    console.error("Backup listing error:", error)
    return { success: false, error: error.message }
  }
}

export async function getBackupDownloadUrl(fileName: string) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: "Missing Supabase configuration." }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Generate a signed URL valid for 1 hour (3600 seconds)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600)

    if (error) {
      console.error("Error creating signed URL:", error)
      return { success: false, error: error.message }
    }

    return { success: true, url: data.signedUrl }
  } catch (error: any) {
    console.error("Backup download URL error:", error)
    return { success: false, error: error.message }
  }
}
