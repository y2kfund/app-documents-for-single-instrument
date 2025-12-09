import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import Documents from '../views/Documents.vue'
// Use the correct type for the routes array
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Documents',
    component: Documents
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router