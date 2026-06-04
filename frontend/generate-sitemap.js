import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://book-verse-production.up.railway.app/api/books?limit=50';
const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app';
const TARGET_PATH = path.resolve(__dirname, 'public/sitemap.xml');

const sanitizeDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (Number.isNaN(d.getTime())) return sanitizeDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const staticRoutes = [
  { loc: `${PRODUCTION_DOMAIN}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${PRODUCTION_DOMAIN}/books`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${PRODUCTION_DOMAIN}/categories`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${PRODUCTION_DOMAIN}/recommended`, changefreq: 'weekly', priority: '1.0' }
];

const buildSitemapXml = (books = []) => {
  const todayStr = sanitizeDate();
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  staticRoutes.forEach(route => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(route.loc)}</loc>\n`;
    xml += `    <lastmod>${todayStr}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  books.forEach(book => {
    if (!book?._id) return;

    const bookUrl = `${PRODUCTION_DOMAIN}/book/${book._id}`;

    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(bookUrl)}</loc>\n`;
    xml += `    <lastmod>${sanitizeDate(book.updatedAt)}</lastmod>\n`;
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';
  return xml;
};

const writeSitemap = (xml) => {
  const dir = path.dirname(TARGET_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(TARGET_PATH, xml, 'utf8');
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

    writeSitemap(buildSitemapXml(books));
    console.log(`Sitemap written successfully to: ${TARGET_PATH}`);
  } catch (error) {
    console.warn(`Database/API fetch failed: ${error.message}. Generating static-only fallback sitemap...`);

    writeSitemap(buildSitemapXml());
    console.log(`Static fallback sitemap written to: ${TARGET_PATH}`);
  }
};

main();
