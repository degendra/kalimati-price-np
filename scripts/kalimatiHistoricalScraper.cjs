const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Create axios instance with cookie support
const client = axios.create({
    withCredentials: true,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

// Cookie jar to maintain session
let cookieJar = '';

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
 * Formats date as YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Generates an array of dates between start and end dates
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Date[]}
 */
function getDatesInRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

/**
 * Gets a fresh CSRF token and updates cookies
 * @returns {Promise<string>} CSRF token
 */
async function getCsrfToken() {
    const response = await client.get('https://kalimatimarket.gov.np/price', {
        timeout: 30000
    });

    // Update cookie jar
    const cookies = response.headers['set-cookie'];
    if (cookies) {
        cookieJar = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    }

    const $ = cheerio.load(response.data);
    const token = $('input[name="_token"]').val();

    if (!token) {
        throw new Error('Could not find CSRF token');
    }

    return token;
}

/**
 * Scrapes price data for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of price data objects
 */
async function scrapePriceForDate(date) {
    try {
        console.log(`🌐 Fetching data for ${date}...`);
        
        // Get fresh CSRF token
        const csrfToken = await getCsrfToken();

        // Create form data
        const formData = new URLSearchParams();
        formData.append('_token', csrfToken);
        formData.append('datePricing', date);

        // Submit the form with the date
        const response = await client.post('https://kalimatimarket.gov.np/price', 
            formData.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'text/html, */*; q=0.01',
                    'Cookie': cookieJar,
                    'Referer': 'https://kalimatimarket.gov.np/price'
                }
            }
        );

        // Parse the response HTML
        const $data = cheerio.load(response.data);
        const priceData = [];

        // Extract data from table
        $data('table#commodityPriceParticular tbody tr').each((_, row) => {
            const columns = $data(row).find('td');
            
            if (columns.length >= 4) {
                const minPrice = parseNepaliPrice($data(columns[2]).text());
                const maxPrice = parseNepaliPrice($data(columns[3]).text());
                const avgPrice = parseNepaliPrice($data(columns[4]).text());

                priceData.push({
                    commodity: $data(columns[0]).text().trim(),
                    unit: $data(columns[1]).text().trim(),
                    minimum: minPrice.number,
                    maximum: maxPrice.number,
                    average: avgPrice.number,
                    np_minimum: minPrice.nepali,
                    np_maximum: maxPrice.nepali,
                    np_average: avgPrice.nepali,
                    date: date
                });
            }
        });

        if (priceData.length === 0) {
            console.warn(`⚠️ No data found for ${date}`);
        } else {
            console.log(`✅ Found ${priceData.length} items for ${date}`);
        }

        return priceData;

    } catch (error) {
        console.error(`❌ Error fetching data for ${date}:`, error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        return [];
    }
}

/**
 * Scrapes historical price data for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
async function scrapeHistoricalPrices(startDate, endDate) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start > end) {
            throw new Error('Start date must be before end date');
        }

        console.log(`📅 Fetching historical data from ${startDate} to ${endDate}`);
        
        const dates = getDatesInRange(start, end);
        const outputPath = path.join(__dirname, '..', 'data');
        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Add delay between requests to avoid overwhelming the server
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // Track success and failures
        let successCount = 0;
        let failureCount = 0;

        for (const date of dates) {
            const formattedDate = formatDate(date);
            const dateData = await scrapePriceForDate(formattedDate);
            
            if (dateData.length > 0) {
                // Save each day's data to a separate file
                const filePath = path.join(
                    outputPath,
                    `kalimati_prices_${formattedDate}.json`
                );
                
                fs.writeFileSync(
                    filePath,
                    JSON.stringify(dateData, null, 2)
                );
                
                console.log(`📁 Data saved to: ${filePath}`);
                successCount++;
            } else {
                console.warn(`⚠️ No data saved for ${formattedDate}`);
                failureCount++;
            }

            // Wait 2 seconds between requests
            await delay(2000);
        }

        // Log summary
        console.log('\n📊 Scraping Summary:');
        console.log(`✅ Successfully scraped: ${successCount} days`);
        console.log(`❌ Failed to scrape: ${failureCount} days`);
        console.log(`📁 Data files saved in: ${outputPath}`);

        if (successCount === 0) {
            throw new Error('No data was successfully scraped for any date');
        }

        return {
            successCount,
            failureCount,
            totalDays: dates.length
        };

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Export the functions
module.exports = {
    scrapeHistoricalPrices,
    scrapePriceForDate
};

// Run the scraper if this file is run directly
if (require.main === module) {
    // Example: Fetch last 7 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    scrapeHistoricalPrices(
        formatDate(startDate),
        formatDate(endDate)
    ).catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
} 