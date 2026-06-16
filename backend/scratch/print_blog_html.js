const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const Blog = require('../models/Blog');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const blog = await Blog.findOne({ status: 'published' }).lean();
        if (!blog) {
            console.log('No published blogs found.');
            return;
        }

        console.log(`\n================ BLOG: ${blog.title} ================`);
        console.log('Raw content snippet (first 1000 characters):');
        console.log(blog.content.slice(0, 1000));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
