const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * Converts Nepali price string to number
 * @param {string} priceStr - Price string in Nepali format (e.g., "रू ६०.००")
 * @returns {{number: number, nepali: string}} Object containing both number and original Nepali string
 */
function parseNepaliPrice(priceStr) {
    try {
        // Remove the Nepali rupee symbol (रू) and trim
        const numStr = priceStr.replace('रू', '').trim();
        
        // Store original Nepali number string
        const nepaliStr = numStr;
        
        // Nepali to English number mapping
        const nepaliNumbers = {
            '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
            '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
        };

        // Convert Nepali digits to English
        const englishNumStr = numStr
            .split('')
            .map(char => nepaliNumbers[char] || char)
            .join('');

        // Parse the resulting string to float
        return {
            number: parseFloat(englishNumStr) || 0,
            nepali: nepaliStr
        };
    } catch (error) {
        console.warn(`Warning: Could not parse price "${priceStr}"`);
        return {
            number: 0,
            nepali: '0'
        };
    }
}

/**
 * Scrapes vegetable and fruit prices from Kalimati Market website
 * @returns {Promise<Array>} Array of price data objects
 */
async function scrapeKalimatiPrices() {
    try {
        console.log('🌐 Fetching data from Kalimati Market website...');
        
        // Fetch the webpage
        const response = await axios.get('https://kalimatimarket.gov.np/price', {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Load the HTML content
        const $ = cheerio.load(response.data);
        const priceData = [];

        // Extract data from table using specific ID
        $('table#commodityPriceParticular tbody tr').each((_, row) => {
            const columns = $(row).find('td');
            
            if (columns.length >= 4) {
                const minPrice = parseNepaliPrice($(columns[2]).text());
                const maxPrice = parseNepaliPrice($(columns[3]).text());
                const avgPrice = parseNepaliPrice($(columns[4]).text());

                priceData.push({
                    commodity: $(columns[0]).text().trim(),
                    unit: $(columns[1]).text().trim(),
                    minimum: minPrice.number,
                    maximum: maxPrice.number,
                    average: avgPrice.number,
                    np_minimum: minPrice.nepali,
                    np_maximum: maxPrice.nepali,
                    np_average: avgPrice.nepali,
                    date: new Date().toISOString().split('T')[0]
                });
            }
        });

        if (!priceData.length) {
            throw new Error('No price data found in the table');
        }

        // Save to JSON file
        const outputPath = path.join(__dirname, '..', 'data');
        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Save data with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filePath = path.join(outputPath, `kalimati_prices_${timestamp}.json`);
        
        fs.writeFileSync(
            filePath,
            JSON.stringify(priceData, null, 2)
        );

        console.log(`✅ Successfully scraped ${priceData.length} items`);
        console.log(`📁 Data saved to: ${filePath}`);

        return priceData;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Export the function
module.exports = {
    scrapeKalimatiPrices
};

// Run the scraper if this file is run directly
if (require.main === module) {
    scrapeKalimatiPrices()
        .catch(error => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
} 