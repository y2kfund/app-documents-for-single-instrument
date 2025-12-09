<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch, inject } from 'vue'
import { useSupabase } from '@y2kfund/core'
import type { ColumnDefinition } from 'tabulator-tables'
import { useTabulator } from '../composables/useTabulator'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import { useDocuments, type Document } from '../composables/useDocuments'

interface documentsProps {
  symbolRoot: string
  userId?: string | null
}

const props = withDefaults(defineProps<documentsProps>(), {
  symbolRoot: 'IBIT',
  userId: '67e578fd-2cf7-48a4-b028-a11a3f89bb9b'
})

const supabase = useSupabase()
const {
  documents,
  isLoading,
  error,
  uploadProgress,
  fetchDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  formatFileSize
} = useDocuments(supabase)

const tableRef = ref<HTMLDivElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const description = ref('')
const selectedFile = ref<File | null>(null)
const showUploadDialog = ref(false)

let tabulator: Tabulator | null = null

const isViewableDocument = (fileType: string): boolean => {
  const viewableTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/html',
    'text/csv'
  ]
  return viewableTypes.includes(fileType)
}

const viewDocument = async (document: Document) => {
  if (!isViewableDocument(document.file_type)) {
    alert('This file type cannot be previewed. Please download it instead.')
    return
  }

  try {
    const { data, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError) throw downloadError

    // Create object URL for preview
    const url = URL.createObjectURL(data)
    
    // Open in new tab
    const newWindow = window.open(url, '_blank')
    
    if (newWindow) {
      // Set document title in new tab
      newWindow.document.title = document.file_name
      
      // Clean up URL after a delay to ensure it loads
      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    } else {
      // Popup blocked, clean up immediately
      URL.revokeObjectURL(url)
      alert('Please allow popups to view documents in a new tab.')
    }
  } catch (err) {
    console.error('Error loading document preview:', err)
    alert('Failed to load document preview')
  }
}

const columns: ColumnDefinition[] = [
  {
    title: 'File Name',
    field: 'file_name',
    //headerFilter: 'input',
    widthGrow: 2
  },
  {
    title: 'Description',
    field: 'description',
    widthGrow: 2
  },
  /*{
    title: 'Size',
    field: 'file_size',
    width: 100,
    formatter: (cell) => formatFileSize(cell.getValue())
  },
  {
    title: 'Type',
    field: 'file_type',
    width: 150
  },
  {
    title: 'Uploaded',
    field: 'uploaded_at',
    width: 180,
    formatter: (cell) => new Date(cell.getValue()).toLocaleString()
  },*/
  {
    title: 'Actions',
    width: 120,
    formatter: (cell) => {
      const document = cell.getRow().getData() as Document
      const canView = isViewableDocument(document.file_type)
      return `
        ${canView ? '<button class="btn-view" title="View"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>' : ''}
        <button class="btn-download" title="Download"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
        <button class="btn-delete" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
      `
    },
    cellClick: async (e, cell) => {
      const target = e.target as HTMLElement
      const document = cell.getRow().getData() as Document
      
      if (target.classList.contains('btn-view')) {
        await viewDocument(document)
      } else if (target.classList.contains('btn-download')) {
        await downloadDocument(document)
      } else if (target.classList.contains('btn-delete')) {
        if (confirm(`Are you sure you want to delete "${document.file_name}"?`)) {
          await deleteDocument(document)
        }
      }
    }
  }
]

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleUpload = async () => {
  if (!selectedFile.value || !props.userId) return

  try {
    await uploadDocument(
      selectedFile.value,
      props.symbolRoot,
      props.userId,
      description.value || undefined
    )
    
    // Reset form
    selectedFile.value = null
    description.value = ''
    showUploadDialog.value = false
    if (fileInput.value) fileInput.value.value = ''
  } catch (err) {
    // Error is handled in the composable
  }
}

const openUploadDialog = () => {
  showUploadDialog.value = true
}

onMounted(async () => {
  await fetchDocuments(props.symbolRoot, props.userId || undefined)
  
  await nextTick()
  
  if (tableRef.value) {
    tabulator = new Tabulator(tableRef.value, {
      data: documents.value,
      columns,
      layout: 'fitColumns',
      //height: '500px',
      pagination: false,
      paginationSize: 20,
      reactiveData: true
    })
  }
})

watch(documents, (newDocs) => {
  if (tabulator) {
    tabulator.setData(newDocs)
  }
}, { deep: true })

onBeforeUnmount(() => {
  if (tabulator) {
    tabulator.destroy()
  }
})
</script>

<template>
  <div class="documents-view">
    <div class="header">
      <h2>Documents</h2>
      <button @click="openUploadDialog" class="btn-upload">Upload</button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
    <div v-if="isLoading" class="loading">Loading...</div>

    <!-- Upload Dialog -->
    <div v-if="showUploadDialog" class="modal-overlay" @click.self="showUploadDialog = false">
      <div class="modal">
        <h3>Upload Document</h3>
        <div class="form-group">
          <label>Select File:</label>
          <input
            ref="fileInput"
            type="file"
            @change="handleFileSelect"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
          />
          <div v-if="selectedFile" class="file-info">
            {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          </div>
        </div>
        <div class="form-group">
          <label>Description (optional):</label>
          <textarea v-model="description" rows="3" placeholder="Enter document description"></textarea>
        </div>
        <div v-if="uploadProgress > 0 && uploadProgress < 100" class="progress-bar">
          <div class="progress" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <div class="modal-actions">
          <button @click="handleUpload" :disabled="!selectedFile || isLoading" class="btn-primary">
            Upload
          </button>
          <button @click="showUploadDialog = false" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>

    <div ref="tableRef"></div>
  </div>
</template>

<style>
@import 'tabulator-tables/dist/css/tabulator_modern.min.css';

.documents-view .tabulator .tabulator-header,
.documents-view .tabulator .tabulator-row,
.documents-view .tabulator .tabulator-header .tabulator-col,
.documents-view .tabulator-row .tabulator-cell,
.documents-view .tabulator .tabulator-tableholder .tabulator-table,
.documents-view .tabulator .tabulator-row:hover {
    background-color: transparent;
}

.documents-view .tabulator {
    background-color: transparent;
    border: none;
}

.tabulator .tabulator-header {
  padding-left: 0 !important;
}
</style>

<style scoped>
@import '../styles/scoped-styles.css';
</style>