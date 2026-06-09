const mongoose = require('mongoose');
const Book = require('../../../../backend/models/Book');

const MONGODB_URI = process.env.MONGODB_URI;

// Cache connection across invocations
let cached = global.__mongoClientPromise;

async function connect() {
    if (cached && cached.connected) return cached.conn;

    if (!MONGODB_URI) {
        throw new Error('Missing MONGODB_URI')
    }

    if (!cached) {
        cached = global.__mongoClientPromise = { connected: false, conn: null };
    }

    if (!cached.connected) {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        cached.connected = true
        cached.conn = mongoose
    }

    return cached.conn
}

module.exports = async (req, res) => {
    const { id } = req.query || {}

    console.log('[SSR REDIRECT] incoming request for /book/:id', { id, url: req.url })

    try {
        await connect()

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.warn('[SSR REDIRECT] invalid ObjectId', { id })
            return res.status(404).send('Book not found')
        }

        const book = await Book.findById(id).select('slug title').lean()

        if (!book) {
            console.warn('[SSR REDIRECT] book not found', { id })
            return res.status(404).send('Book not found')
        }

        let targetSlug = book.slug
        if (!targetSlug && book.title) {
            targetSlug = String(book.title)
                .normalize('NFKD')
                .replace(/[^a-zA-Z0-9\\s-]/g, '')
                .toLowerCase()
                .trim()
                .replace(/[\\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'book'
            console.warn('[SSR REDIRECT] generated fallback slug', { id, generated: targetSlug })
        }

        if (!targetSlug) {
            console.warn('[SSR REDIRECT] no slug or title available, redirecting to /books', { id })
            res.setHeader('Cache-Control', 'no-cache')
            return res.writeHead(301, { Location: '/books' }).end()
        }

        const location = `/read/${encodeURIComponent(targetSlug)}/`
        console.log('[SSR REDIRECT] redirecting', { id, location })
        res.setHeader('Cache-Control', 'public, max-age=3600')
        return res.writeHead(301, { Location: location }).end()
    } catch (err) {
        console.error('[SSR REDIRECT] error', err && err.message)
        return res.status(500).send('Internal server error')
    }
}
