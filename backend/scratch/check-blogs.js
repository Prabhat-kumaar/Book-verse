const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const Blog = require('../models/Blog');

async function run() {
    try {
        console.log('Connecting to MongoDB using: ' + process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const blogs = await Blog.find({ status: 'published' }).lean();
        console.log(`Found ${blogs.length} published blogs.`);
        
        blogs.forEach((b, i) => {
            console.log(`\n================ BLOG #${i+1}: ${b.title} ================`);
            console.log(`Category: ${b.category}`);
            console.log(`Excerpt: ${b.excerpt}`);
            console.log(`Content length: ${b.content.length}`);
            console.log('--- CONTENT SAMPLE (first 1500 chars) ---');
            console.log(b.content.slice(0, 1500));
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
