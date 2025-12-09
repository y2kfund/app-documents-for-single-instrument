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
    headerFilter: 'input',
    widthGrow: 2
  },
  {
    title: 'Description',
    field: 'description',
    widthGrow: 2
  },
  {
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
  },
  {
    title: 'Actions',
    width: 200,
    formatter: (cell) => {
      const document = cell.getRow().getData() as Document
      const canView = isViewableDocument(document.file_type)
      return `
        ${canView ? '<button class="btn-view">View</button>' : ''}
        <button class="btn-download">Download</button>
        <button class="btn-delete">Delete</button>
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
      height: '500px',
      pagination: true,
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
      <h2>Documents for Instrument: {{ props.symbolRoot }}</h2>
      <button @click="openUploadDialog" class="btn-upload">Upload Document</button>
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
</style>

<style scoped>
.documents-view {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-upload {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-upload:hover {
  background-color: #45a049;
}

.error-message {
  color: #f44336;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #ffebee;
  border-radius: 4px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  min-width: 500px;
  max-width: 90%;
}

.modal h3 {
  margin-top: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[type="file"],
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.file-info {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
}

.progress {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background-color: #2196F3;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0b7dda;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

:deep(.btn-view),
:deep(.btn-download),
:deep(.btn-delete) {
  padding: 5px 10px;
  margin: 0 2px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

:deep(.btn-view) {
  background-color: #9C27B0;
  color: white;
}

:deep(.btn-view:hover) {
  background-color: #7B1FA2;
}

:deep(.btn-download) {
  background-color: #2196F3;
  color: white;
}

:deep(.btn-download:hover) {
  background-color: #0b7dda;
}

:deep(.btn-delete) {
  background-color: #f44336;
  color: white;
}

:deep(.btn-delete:hover) {
  background-color: #da190b;
}
</style>