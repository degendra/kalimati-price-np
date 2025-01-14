<template>
  <div class="home">
    <div class="filters">
      <div class="source-link">
        Data Source: <a href="https://kalimatimarket.gov.np/" target="_blank" rel="noopener">Kalimati Market</a>
      </div>
      <input 
        type="date" 
        v-model="selectedDate"
        :max="today"
        @change="loadPriceData"
      >
      <div class="selected-date">
        Showing prices for: {{ new Date(selectedDate).toLocaleDateString() }}
      </div>
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else>
      <!-- Simplified Common Items Section -->
      <div class="common-items">
        <div class="common-section">
          <div class="section-header">
            <h2>Common Items</h2>
          </div>
          <div class="common-grid">
            <div class="category">
              <h3>Vegetables</h3>
              <div class="items-list">
                <div v-for="item in getCommonItemsData('vegetables')" 
                     :key="item.commodity" 
                     class="item">
                  <span class="name">{{ item.commodity }}</span>
                  <span class="price">
                    <span class="np-price">रू {{ item.np_average }}</span>
                    <small class="unit">/ {{ item.unit }}</small>
                  </span>
                </div>
              </div>
            </div>
            <div class="category">
              <h3>Fruits</h3>
              <div class="items-list">
                <div v-for="item in getCommonItemsData('fruits')" 
                     :key="item.commodity" 
                     class="item">
                  <span class="name">{{ item.commodity }}</span>
                  <span class="price">
                    <span class="np-price">रू {{ item.np_average }}</span>
                    <small class="unit">/ {{ item.unit }}</small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Table Section -->
      <div class="price-table">
        <table>
          <thead>
            <tr>
              <th>Commodity</th>
              <th>Unit</th>
              <th @click="sortData('minimum')" class="sortable">
                Minimum
                <span v-if="sortBy === 'minimum'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortData('maximum')" class="sortable">
                Maximum
                <span v-if="sortBy === 'maximum'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortData('average')" class="sortable">
                Average
                <span v-if="sortBy === 'average'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sortedPriceData" :key="item.commodity">
              <td>{{ item.commodity }}</td>
              <td>{{ item.unit }}</td>
              <td>
                <span class="np-price">रू {{ item.np_minimum }}</span>
                <span class="en-price">(Rs. {{ item.minimum }})</span>
              </td>
              <td>
                <span class="np-price">रू {{ item.np_maximum }}</span>
                <span class="en-price">(Rs. {{ item.maximum }})</span>
              </td>
              <td>
                <span class="np-price">रू {{ item.np_average }}</span>
                <span class="en-price">(Rs. {{ item.average }})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface PriceData {
  commodity: string
  unit: string
  minimum: number
  maximum: number
  average: number
  np_minimum: string
  np_maximum: string
  np_average: string
  date: string
}

const priceData = ref<PriceData[]>([])
const loading = ref(false)
const error = ref('')
const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)

// Add sort state
const sortBy = ref<'minimum' | 'maximum' | 'average' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Add sort function
function sortData(field: 'minimum' | 'maximum' | 'average') {
  if (sortBy.value === field) {
    // Toggle direction if clicking same field
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New field, set to desc by default (highest first)
    sortBy.value = field
    sortDirection.value = 'desc'
  }
}

// Add computed sorted data
const sortedPriceData = computed(() => {
  if (!sortBy.value) return priceData.value

  const field = sortBy.value as keyof Pick<PriceData, 'minimum' | 'maximum' | 'average'>
  return [...priceData.value].sort((a, b) => {
    const modifier = sortDirection.value === 'asc' ? 1 : -1
    return (a[field] - b[field]) * modifier
  })
})

// Add list of common vegetables and fruits
const COMMON_ITEMS = {
  vegetables: [
    'आलु रातो',
    'प्याज सुकेको (भारतीय)',
    'गोलभेडा ठूलो(भारतीय)',
    'बन्दा(लोकल)',
    'काउली स्थानिय',
    'मूला(लोकल)',
    'करेला(लोकल)',
    'भन्टा लाम्चो',
    'हरियो धनिया',
    'पालुङ्गो साग'
  ],
  fruits: [
    'स्याउ(फूजी)',
    'केरा',
    'सुन्तला(लोकल)',
    'मौसम',
    'अनार',
    'नास्पाती(चाइनिज)',
    'अंगुर(कालो)',
    'किवि',
    'भुई कटहर',
    'मेवा'
  ]
}

// Add function to get common items data
function getCommonItemsData(type: 'vegetables' | 'fruits') {
  return COMMON_ITEMS[type]
    .map(name => priceData.value.find(item => item.commodity === name))
    .filter((item): item is PriceData => item !== undefined)
}

async function loadPriceData() {
  loading.value = true
  error.value = ''
  
  try {
    const response = await fetch(`/data/kalimati_prices_${selectedDate.value}.json`)
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      throw new Error('Price data not available for selected date')
    }

    if (!response.ok) {
      throw new Error('Failed to load price data')
    }

    const data = await response.json()
    
    // Validate data structure
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No price data available for selected date')
    }

    priceData.value = data

  } catch (err) {
    console.error('Error loading price data:', err)
    
    // Handle different error cases
    if (err instanceof SyntaxError) {
      error.value = 'Price data not available for selected date'
    } else if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = 'Failed to load price data'
    }
    
    priceData.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPriceData()
})
</script>

<style scoped>
.home {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f0f7f4;
  min-height: calc(100vh - 60px);
}

.filters {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.filters input {
  padding: 10px 16px;
  font-size: 16px;
  border: 2px solid #4ade80;
  border-radius: 8px;
  background: white;
  color: #166534;
  transition: all 0.3s ease;
  cursor: pointer;
}

.filters input:hover {
  border-color: #22c55e;
}

.filters input:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.loading, .error {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.error {
  color: #dc2626;
  border-left: 4px solid #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.error::before {
  content: '⚠️';
  font-size: 24px;
}

/* Table Section Styles */
.price-table {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-top: 4px solid #22c55e;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

th, td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

th {
  background-color: #f0fdf4;
  font-weight: 600;
  color: #166534;
  position: sticky;
  top: 0;
  z-index: 10;
  transition: background-color 0.2s ease;
}

th:first-child {
  border-top-left-radius: 12px;
}

th:last-child {
  border-top-right-radius: 12px;
}

tr:last-child td:first-child {
  border-bottom-left-radius: 12px;
}

tr:last-child td:last-child {
  border-bottom-right-radius: 12px;
}

tr:hover {
  background-color: #f0fdf4;
}

.np-price {
  display: block;
  font-size: 1.1em;
  color: #166534;
  font-weight: 500;
}

.en-price {
  display: block;
  font-size: 0.9em;
  color: #65a30d;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .home {
    padding: 16px;
    background: #f0f7f4;
  }

  .filters {
    align-items: stretch;
  }

  .selected-date {
    text-align: center;
  }

  .filters input {
    width: 100%;
  }

  .price-table {
    font-size: 14px;
    margin: 0 -16px;
    border-radius: 0;
  }

  th, td {
    padding: 12px;
  }

  th:first-child,
  th:last-child,
  tr:last-child td:first-child,
  tr:last-child td:last-child {
    border-radius: 0;
  }

  .source-link {
    text-align: center;
    margin-bottom: 8px;
  }
}

/* Custom scrollbar for the table */
.price-table::-webkit-scrollbar {
  height: 8px;
}

.price-table::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.price-table::-webkit-scrollbar-thumb {
  background: #22c55e;
  border-radius: 4px;
}

.price-table::-webkit-scrollbar-thumb:hover {
  background: #16a34a;
}

.selected-date {
  font-size: 0.9em;
  color: #166534;
  font-weight: 500;
}

/* Simplified Common Items Styles */
.common-items {
  margin-bottom: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 20px;
  border-top: 4px solid #22c55e;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  color: #166534;
  font-size: 1.25rem;
  font-weight: 600;
}

.common-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.category h3 {
  color: white;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
}

.category:first-child h3 {
  background: linear-gradient(to right, #22c55e, #16a34a);
}

.category:last-child h3 {
  background: linear-gradient(to right, #fb923c, #ea580c);
}

.items-list {
  display: grid;
  gap: 8px;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.item:hover {
  background-color: #f0fdf4;
  border-left-color: #22c55e;
}

.category:last-child .item:hover {
  background-color: #fff7ed;
  border-left-color: #fb923c;
}

.name {
  color: #374151;
  font-size: 0.95rem;
}

.price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price .np-price {
  color: #166534;
  font-weight: 600;
}

.price .unit {
  color: #718096;
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .common-items {
    margin: 0 -16px 30px -16px;
    border-radius: 0;
    border-top: none;
    border-bottom: 4px solid #22c55e;
  }

  .common-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .category h3 {
    text-align: left;
  }
}

/* Add sorting styles */
.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 24px !important;
}

.sortable:hover {
  background-color: #dcfce7;
}

.sort-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #22c55e;
  font-weight: bold;
}

/* Add visual feedback for sortable columns */
.sortable::after {
  content: '↕';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.3;
}

.sortable:hover::after {
  opacity: 0.7;
}

/* Hide the default arrow when column is actively sorted */
.sortable:has(.sort-icon)::after {
  display: none;
}

.source-link {
  font-size: 0.9em;
  color: #166534;
}

.source-link a {
  color: #16a34a;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.source-link a:hover {
  color: #22c55e;
  text-decoration: underline;
}
</style> 