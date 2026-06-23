require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const User = require('../models/User');

async function runTest() {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Connected.');

    // Fetch user for auth token
    const user = await User.findOne({});
    if (!user) {
        console.error('No user found in the database. Run backend after registering a user.');
        process.exit(1);
    }
    console.log(`Using test user: ${user.username} (${user._id})`);

    // Sign JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Generated JWT Token successfully.');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const baseUrl = 'http://localhost:5000/api/dictionary';

    // Test 1: GET /api/dictionary/meaning/:word
    console.log('\n--- TEST 1: GET /api/dictionary/meaning/hello (First Request - Cache Miss) ---');
    const meaningRes = await fetch(`${baseUrl}/meaning/hello`, { headers });
    const meaningData = await meaningRes.json();
    console.log('Status:', meaningRes.status);
    console.log('Response Body Snippet:', JSON.stringify(meaningData, null, 2).slice(0, 1000));

    // Test 1b: GET /api/dictionary/meaning/:word (Second Request - Cache Hit)
    console.log('\n--- TEST 1b: GET /api/dictionary/meaning/hello (Second Request - Cache Hit) ---');
    const meaningRes2 = await fetch(`${baseUrl}/meaning/hello`, { headers });
    const meaningData2 = await meaningRes2.json();
    console.log('Status:', meaningRes2.status);
    console.log('Response Body Snippet:', JSON.stringify(meaningData2, null, 2).slice(0, 1000));

    // Test 2: GET /api/dictionary/translate?text=hello%20world&target=hi
    console.log('\n--- TEST 2: GET /api/dictionary/translate?text=hello%20world&target=hi (First Request - Cache Miss) ---');
    const transRes = await fetch(`${baseUrl}/translate?text=hello%20world&target=hi`, { headers });
    const transData = await transRes.json();
    console.log('Status:', transRes.status);
    console.log('Response Body:', JSON.stringify(transData, null, 2));

    // Test 2b: GET /api/dictionary/translate?text=hello%20world&target=hi (Second Request - Cache Hit)
    console.log('\n--- TEST 2b: GET /api/dictionary/translate?text=hello%20world&target=hi (Second Request - Cache Hit) ---');
    const transRes2 = await fetch(`${baseUrl}/translate?text=hello%20world&target=hi`, { headers });
    const transData2 = await transRes2.json();
    console.log('Status:', transRes2.status);
    console.log('Response Body:', JSON.stringify(transData2, null, 2));

    // Test 3: GET /api/dictionary/meaning/nonexistentword12345 (404 Error Handling)
    console.log('\n--- TEST 3: GET /api/dictionary/meaning/nonexistentword12345 (404 check) ---');
    const errorRes = await fetch(`${baseUrl}/meaning/nonexistentword12345`, { headers });
    const errorData = await errorRes.json();
    console.log('Status:', errorRes.status);
    console.log('Response Body:', JSON.stringify(errorData, null, 2));

    console.log('\nAll dictionary/translation tests executed.');
    await mongoose.disconnect();
    process.exit(0);
}

runTest().catch(err => {
    console.error('Test run error:', err);
    mongoose.disconnect();
    process.exit(1);
});
