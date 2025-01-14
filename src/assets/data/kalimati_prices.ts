export interface PriceData {
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

// Import all JSON files
import data20250101 from './kalimati_prices_2025-01-01.json'
import data20250102 from './kalimati_prices_2025-01-02.json'
import data20250103 from './kalimati_prices_2025-01-03.json'
import data20250104 from './kalimati_prices_2025-01-04.json'
import data20250105 from './kalimati_prices_2025-01-05.json'
import data20250106 from './kalimati_prices_2025-01-06.json'
import data20250107 from './kalimati_prices_2025-01-07.json'
import data20250108 from './kalimati_prices_2025-01-08.json'
import data20250109 from './kalimati_prices_2025-01-09.json'
import data20250110 from './kalimati_prices_2025-01-10.json'
import data20250111 from './kalimati_prices_2025-01-11.json'
import data20250112 from './kalimati_prices_2025-01-12.json'
import data20250113 from './kalimati_prices_2025-01-13.json'
import data20250114 from './kalimati_prices_2025-01-14.json'

// Merge all data into a single object with dates as keys
export const priceData: { [key: string]: PriceData[] } = {
  "2025-01-01": data20250101,
  "2025-01-02": data20250102,
  "2025-01-03": data20250103,
  "2025-01-04": data20250104,
  "2025-01-05": data20250105,
  "2025-01-06": data20250106,
  "2025-01-07": data20250107,
  "2025-01-08": data20250108,
  "2025-01-09": data20250109,
  "2025-01-10": data20250110,
  "2025-01-11": data20250111,
  "2025-01-12": data20250112,
  "2025-01-13": data20250113,
  "2025-01-14": data20250114
}

// Get available dates
export const availableDates = Object.keys(priceData).sort()

// Get latest date
export const latestDate = availableDates[availableDates.length - 1] 