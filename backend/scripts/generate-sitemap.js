const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Resolve path to the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

let Book;
try {
    Book = require('../models/Book');
} catch (e) {
    // Model import fallback
}

const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app';

const main = async () => {
    const mongoUri = process.env.MONGODB_URI;
    let books = [];
    let dbConnected = false;

    if (!mongoUri) {
        console.warn('MONGODB_URI is not set in backend/.env. Using static routes only.');
    } else {
        try {
            console.log('Connecting to database...');
            // Set 5-second timeout for connection attempt to avoid hanging
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000
            });
            console.log('Database connected successfully.');
            dbConnected = true;

            if (Book) {
                console.log('Fetching books...');
                books = await Book.find({}, '_id updatedAt').lean();
                console.log(`Fetched ${books.length} books.`);
            }
        } catch (dbError) {
            console.warn(`Database connection failed: ${dbError.message}. Falling back to static routes only.`);
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Build sitemap XML string
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Static Routes
    const staticRoutes = [
        { path: '/', changefreq: 'daily', priority: '1.0' },
        { path: '/books', changefreq: 'daily', priority: '0.9' },
        { path: '/categories', changefreq: 'weekly', priority: '0.8' },
        { path: '/recommended', changefreq: 'daily', priority: '0.8' }
    ];

    staticRoutes.forEach(route => {
        xml += '  <url>\n';
        xml += `    <loc>${PRODUCTION_DOMAIN}${route.path}</loc>\n`;
        xml += `    <lastmod>${todayStr}</lastmod>\n`;
        xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
        xml += `    <priority>${route.priority}</priority>\n`;
        xml += '  </url>\n';
    });

    // 2. Dynamic Book Routes
    if (books.length > 0) {
        books.forEach(book => {
            const lastModDate = book.updatedAt 
                ? new Date(book.updatedAt).toISOString().split('T')[0] 
                : todayStr;

            xml += '  <url>\n';
            xml += `    <loc>${PRODUCTION_DOMAIN}/book/${book._id}</loc>\n`;
            xml += `    <lastmod>${lastModDate}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.7</priority>\n`;
            xml += '  </url>\n';
        });
    }

    xml += '</urlset>\n';

    // Resolve target path for sitemap.xml in frontend/public
    const sitemapPath = path.resolve(__dirname, '../../frontend/public/sitemap.xml');
    console.log(`Writing sitemap to ${sitemapPath}...`);
    
    // Ensure public folder exists just in case
    const publicDir = path.dirname(sitemapPath);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log('Sitemap generated successfully.');

    if (dbConnected) {
        await mongoose.disconnect();
        console.log('Database disconnected.');
    }
};

main().catch((error) => {
    console.error(`Sitemap generation script error: ${error.message}`);
    process.exit(1);
});
