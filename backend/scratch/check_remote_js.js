const axios = require('axios');

async function run() {
    try {
        const url = 'https://book-verse.lovable.app/assets/index-CUHm9W9i.js';
        console.log('Fetching JS bundle...');
        const response = await axios.get(url);
        const code = response.data;
        console.log(`Fetched JS bundle. Length: ${code.length} characters.`);

        // Search for keywords
        const keywords = ['letmein', 'passcode', 'password', 'gate', 'lock'];
        keywords.forEach(keyword => {
            const idx = code.indexOf(keyword);
            if (idx !== -1) {
                console.log(`Found keyword "${keyword}" at index ${idx}.`);
                // Print a snippet around it
                console.log('Snippet:', code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 150)));
            } else {
                console.log(`Keyword "${keyword}" not found.`);
            }
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
