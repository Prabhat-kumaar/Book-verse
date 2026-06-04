const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Book = require('../models/Book');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const migrateSlugs = async () => {
    const mongoUri = (process.env.MONGODB_URI || '').trim();

    if (!mongoUri) {
        throw new Error('Missing MONGODB_URI in backend/.env');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const books = await Book.find();
    console.log(`Found ${books.length} books`);

    for (const book of books) {
        book.slug = undefined;
        await book.save();
        console.log(`${book.title} -> ${book.slug}`);
    }

    console.log(`Slug migration completed for ${books.length} books`);
};

migrateSlugs()
    .catch((error) => {
        console.error('Slug migration failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close();
    });
