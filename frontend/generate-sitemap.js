import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TARGET_DIR = path.resolve(__dirname, 'public')
const API_URL = 'https://book-verse-production.up.railway.app/api/books?limit=500'
const PRODUCTION_DOMAIN = 'https://readifyai.vercel.app'
const MAX_URLS_PER_FILE = 45000
const MAIN_SITEMAP = 'sitemap.xml'

const sanitizeDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date()
  if (Number.isNaN(d.getTime())) return sanitizeDate()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const escapeXml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const staticRoutes = [
  { loc: `${PRODUCTION_DOMAIN}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${PRODUCTION_DOMAIN}/books`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${PRODUCTION_DOMAIN}/categories`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${PRODUCTION_DOMAIN}/recommended`, changefreq: 'weekly', priority: '1.0' },
]

const buildUrlEntry = ({ loc, lastmod, changefreq, priority }) => {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')
}

const buildUrlSet = (routes) => {
  const today = sanitizeDate()
  const entries = routes.map((route) => buildUrlEntry({
    loc: route.loc,
    lastmod: route.lastmod || today,
    changefreq: route.changefreq || 'monthly',
    priority: route.priority || '0.5',
  }))

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n') + '\n'
}

const buildSitemapIndex = (sitemaps) => {
  const entries = sitemaps.map((sitemap) => [
    '  <sitemap>',
    `    <loc>${escapeXml(sitemap.loc)}</loc>`,
    `    <lastmod>${escapeXml(sitemap.lastmod)}</lastmod>`,
    '  </sitemap>',
  ].join('\n'))

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</sitemapindex>',
  ].join('\n') + '\n'
}

const writeFile = (fileName, content) => {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true })
  }
  fs.writeFileSync(path.join(TARGET_DIR, fileName), content, 'utf8')
}

const fetchBooks = async () => {
  if (typeof fetch === 'function') {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  }

  const https = await import('https')
  return new Promise((resolve, reject) => {
    https.get(API_URL, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (error) {
          reject(error)
        }
      })
    }).on('error', reject)
  })
}

const normalizeBooks = (payload) => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.books)
      ? payload.books
      : Array.isArray(payload?.data)
        ? payload.data
        : []

  return items.filter((book) => book && book.slug)
}

const buildBookRoutes = (books) => books.map((book) => ({
  loc: `${PRODUCTION_DOMAIN}/read/${book.slug}`,
  lastmod: sanitizeDate(book?.updatedAt || book?.createdAt),
  changefreq: 'monthly',
  priority: '0.8',
}))

const buildSitemaps = (books) => {
  const routes = [...staticRoutes, ...buildBookRoutes(books)]
  const chunks = []

  for (let i = 0; i < routes.length; i += MAX_URLS_PER_FILE) {
    chunks.push(routes.slice(i, i + MAX_URLS_PER_FILE))
  }

  if (chunks.length === 1) {
    writeFile(MAIN_SITEMAP, buildUrlSet(chunks[0]))
    return [MAIN_SITEMAP]
  }

  const sitemapFiles = chunks.map((chunk, index) => {
    const fileName = `sitemap-${index + 1}.xml`
    writeFile(fileName, buildUrlSet(chunk))
    return {
      loc: `${PRODUCTION_DOMAIN}/${fileName}`,
      lastmod: sanitizeDate(),
    }
  })

  writeFile(MAIN_SITEMAP, buildSitemapIndex(sitemapFiles))
  return [MAIN_SITEMAP, ...sitemapFiles.map((sitemap) => sitemap.loc)]
}

const main = async () => {
  try {
    console.log(`Fetching books from ${API_URL}...`)
    const payload = await fetchBooks()
    const books = normalizeBooks(payload)
    console.log(`Found ${books.length} book URLs to index.`)

    const files = buildSitemaps(books)
    console.log(`Wrote ${files.length} sitemap file(s) into ${TARGET_DIR}`)
  } catch (error) {
    console.warn(`Book API fetch failed: ${error.message}. Writing fallback sitemap.`)
    buildSitemaps([])
    console.log(`Fallback sitemap written into ${TARGET_DIR}`)
  }
}

main()
