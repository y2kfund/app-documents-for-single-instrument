<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch, inject } from 'vue'
import { useSupabase } from '@y2kfund/core'
import type { ColumnDefinition } from 'tabulator-tables'
import { useTabulator } from '../composables/useTabulator'
import { TabulatorFull as Tabulator } from 'tabulator-tables'

interface documentsProps {
  symbolRoot: string
  userId?: string | null
}

const props = withDefaults(defineProps<documentsProps>(), {
  symbolRoot: 'IBIT',
  userId: '67e578fd-2cf7-48a4-b028-a11a3f89bb9b'
})

const supabase = useSupabase()

</script>

<template>
  <div class="put-positions-for-single-instrument-view">
    <h2>Documents for Instrument: {{ props.symbolRoot }}</h2>
    <!-- Additional UI elements and Tabulator table will go here -->
  </div>
</template>

<style>
@import 'tabulator-tables/dist/css/tabulator_modern.min.css';
/*@import '../styles/styles.css';*/
</style>

<style scoped>
/*@import '../styles/scoped-styles.css';*/
</style>