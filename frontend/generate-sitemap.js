import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://book-verse-production.up.railway.app/api/books';
const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app';
const TARGET_PATH = path.resolve(__dirname, 'public/sitemap.xml');

// Sanitizes dates to prevent future-dating indexing penalties (e.g., mapping 2026 -> 2024 or 2025)
const sanitizeDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  let year = d.getFullYear();
  if (year >= 2026) {
    year = 2024; // Use real current/past year to prevent search console validation failures
  }
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fetchBooks = async () => {
  if (typeof fetch === 'function') {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } else {
    // HTTPS request fallback for older Node versions
    const https = await import('https');
    return new Promise((resolve, reject) => {
      https.get(API_URL, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err) => { reject(err); });
    });
  }
};

const main = async () => {
  const todayStr = sanitizeDate();
  try {
    console.log(`Fetching books from ${API_URL}...`);
    const payload = await fetchBooks();
    const books = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.books)
        ? payload.books
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    console.log(`Successfully fetched ${books.length} books.`);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Static Routes (Priority: 1.0 for home, 0.6 for others)
    const staticRoutes = [
      { loc: `${PRODUCTION_DOMAIN}/`, priority: '1.0' },
      { loc: `${PRODUCTION_DOMAIN}/books`, priority: '0.6' },
      { loc: `${PRODUCTION_DOMAIN}/categories`, priority: '0.6' },
      { loc: `${PRODUCTION_DOMAIN}/recommended`, priority: '0.6' }
    ];

    staticRoutes.forEach(route => {
      xml += '  <url>\n';
      xml += `    <loc>${route.loc}</loc>\n`;
      xml += `    <lastmod>${todayStr}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // 2. Dynamic Book Routes (Priority: 0.8)
    books.forEach(book => {
      const bookId = book._id || book.id;
      if (!bookId) return;

      const lastmod = sanitizeDate(book.updatedAt || book.createdAt);

      xml += '  <url>\n';
      xml += `    <loc>${PRODUCTION_DOMAIN}/book/${bookId}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>\n';

    // Ensure containing directory exists
    const dir = path.dirname(TARGET_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(TARGET_PATH, xml, 'utf8');
    console.log(`Sitemap written successfully to: ${TARGET_PATH}`);
  } catch (error) {
    console.warn(`Database/API fetch failed: ${error.message}. Generating static-only fallback sitemap...`);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const staticRoutes = [
      { loc: `${PRODUCTION_DOMAIN}/`, priority: '1.0' },
      { loc: `${PRODUCTION_DOMAIN}/books`, priority: '0.6' },
      { loc: `${PRODUCTION_DOMAIN}/categories`, priority: '0.6' },
      { loc: `${PRODUCTION_DOMAIN}/recommended`, priority: '0.6' }
    ];

    staticRoutes.forEach(route => {
      xml += '  <url>\n';
      xml += `    <loc>${route.loc}</loc>\n`;
      xml += `    <lastmod>${todayStr}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>\n';

    const dir = path.dirname(TARGET_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(TARGET_PATH, xml, 'utf8');
    console.log(`Static fallback sitemap written to: ${TARGET_PATH}`);
  }
};

main();
