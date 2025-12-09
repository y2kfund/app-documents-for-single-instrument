import { ref, computed } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Document {
  id: string
  user_id: string
  symbol_root: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  uploaded_at: string
  description?: string
}

export function useDocuments(supabase: SupabaseClient) {
  const documents = ref<Document[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref(0)

  const fetchDocuments = async (symbolRoot: string, userId?: string) => {
    isLoading.value = true
    error.value = null

    try {
      let query = supabase
        .schema('hf')
        .from('documents')
        .select('*')
        .eq('symbol_root', symbolRoot)
        .order('uploaded_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      documents.value = data || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch documents'
      console.error('Error fetching documents:', err)
    } finally {
      isLoading.value = false
    }
  }

  const uploadDocument = async (
    file: File,
    symbolRoot: string,
    userId: string,
    description?: string
  ) => {
    isLoading.value = true
    error.value = null
    uploadProgress.value = 0

    try {
      // Create storage path
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${symbolRoot}/${userId}/${timestamp}_${sanitizedFileName}`

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Insert document record
      const { data, error: insertError } = await supabase
        .schema('hf')
        .from('documents')
        .insert({
          user_id: userId,
          symbol_root: symbolRoot,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          description: description || null
        })
        .select()
        .single()

      if (insertError) throw insertError

      uploadProgress.value = 100
      documents.value.unshift(data)

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to upload document'
      console.error('Error uploading document:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.storage_path)

      if (downloadError) throw downloadError

      // Create download link
      const url = URL.createObjectURL(data)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.file_name
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to download document'
      console.error('Error downloading document:', err)
    }
  }

  const deleteDocument = async (document: Document) => {
    isLoading.value = true
    error.value = null

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: deleteError } = await supabase
        .schema('hf')
        .from('documents')
        .delete()
        .eq('id', document.id)

      if (deleteError) throw deleteError

      documents.value = documents.value.filter(doc => doc.id !== document.id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete document'
      console.error('Error deleting document:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return {
    documents,
    isLoading,
    error,
    uploadProgress,
    fetchDocuments,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    formatFileSize
  }
}