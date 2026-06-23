require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const User = require('./models/User');
const Book = require('./models/Book');

async function runTest() {
    console.log('Connecting to database via connectDB...');
    await connectDB();
    console.log('Connected.');

    // 1. Fetch a user
    const user = await User.findOne({});
    if (!user) {
        console.error('No user found in the database. Please register a user first.');
        process.exit(1);
    }
    console.log(`Using test user: ${user.username} (${user._id})`);

    // 2. Fetch a book
    const book = await Book.findOne({});
    if (!book) {
        console.error('No book found in the database. Please add a book first.');
        process.exit(1);
    }
    console.log(`Using test book: ${book.title} (${book._id})`);

    // 3. Sign a JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Generated JWT Token successfully.');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const baseUrl = 'http://localhost:5000/api/highlights';

    // Test 1: POST /api/highlights
    console.log('\n--- TEST 1: POST /api/highlights ---');
    const postPayload = {
        book: book._id.toString(),
        cfiRange: 'epubcfi(/6/4[chap-2]!/4/2/10/1:0)',
        text: 'This is a test highlight text.',
        color: 'green'
    };

    const postRes = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(postPayload)
    });
    const postData = await postRes.json();
    console.log('POST Response Status:', postRes.status);
    console.log('POST Response Body:', JSON.stringify(postData, null, 2));

    if (!postData.success) {
        console.error('POST test failed!');
        process.exit(1);
    }

    const highlightId = postData.data._id;

    // Test 2: GET /api/highlights/:bookId
    console.log(`\n--- TEST 2: GET /api/highlights/${book._id} ---`);
    const getRes = await fetch(`${baseUrl}/${book._id}`, {
        method: 'GET',
        headers
    });
    const getData = await getRes.json();
    console.log('GET Response Status:', getRes.status);
    console.log('GET Response Body:', JSON.stringify(getData, null, 2));

    // Confirm our highlight appears in the list
    const found = getData.data.find(h => h._id === highlightId);
    if (found) {
        console.log('SUCCESS: Newly created highlight found in GET response.');
    } else {
        console.error('FAILURE: Newly created highlight not found in GET response!');
        process.exit(1);
    }

    // Test 3: DELETE /api/highlights/:id
    console.log(`\n--- TEST 3: DELETE /api/highlights/${highlightId} ---`);
    const deleteRes = await fetch(`${baseUrl}/${highlightId}`, {
        method: 'DELETE',
        headers
    });
    const deleteData = await deleteRes.json();
    console.log('DELETE Response Status:', deleteRes.status);
    console.log('DELETE Response Body:', JSON.stringify(deleteData, null, 2));

    // Test 4: Re-run GET to verify it's gone
    console.log(`\n--- TEST 4: GET /api/highlights/${book._id} (Post-Delete Verification) ---`);
    const verifyGetRes = await fetch(`${baseUrl}/${book._id}`, {
        method: 'GET',
        headers
    });
    const verifyGetData = await verifyGetRes.json();
    const stillFound = verifyGetData.data.find(h => h._id === highlightId);
    if (!stillFound) {
        console.log('SUCCESS: Highlight deleted and verified gone.');
    } else {
        console.error('FAILURE: Highlight still found in GET response after delete!');
        process.exit(1);
    }

    console.log('\nAll backend tests passed successfully!');
    await mongoose.disconnect();
    process.exit(0);
}

runTest().catch(err => {
    console.error('Test run error:', err);
    mongoose.disconnect();
    process.exit(1);
});
