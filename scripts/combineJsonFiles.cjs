const fs = require('fs');
const path = require('path');

// Paths
const dataDir = path.join(__dirname, '..', 'data');
const outputDir = path.join(__dirname, '..', 'src', 'assets');
const outputFile = path.join(outputDir, 'kalimati_prices.ts');

// Read all JSON files from data directory
const files = fs.readdirSync(dataDir)
  .filter(file => file.endsWith('.json'))
  .sort(); // Sort files to maintain order

// Combine data
const combinedData = {};

files.forEach(file => {
  const date = file.replace('kalimati_prices_', '').replace('.json', '');
  const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
  combinedData[date] = JSON.parse(content);
});

// Create TypeScript interface and data export
const tsContent = `
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

export const priceData: { [key: string]: PriceData[] } = ${JSON.stringify(combinedData, null, 2)}

// Get available dates
export const availableDates = Object.keys(priceData).sort()

// Get latest date
export const latestDate = availableDates[availableDates.length - 1]
`;

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the combined file
fs.writeFileSync(outputFile, tsContent);

console.log(`✅ Combined ${files.length} files into ${outputFile}`);
console.log(`📅 Date range: ${files[0].replace('kalimati_prices_', '').replace('.json', '')} to ${files[files.length - 1].replace('kalimati_prices_', '').replace('.json', '')}`); 