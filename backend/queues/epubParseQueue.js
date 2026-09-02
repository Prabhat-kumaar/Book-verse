const EventEmitter = require('events');
const Book = require('../models/Book');
const Chapter = require('../models/Chapter');
const { parseEpub } = require('../utils/epubParser');

class EpubParseQueue extends EventEmitter {
    constructor(concurrency = 2) {
        super();
        this.concurrency = concurrency;
        this.activeCount = 0;
        this.queue = [];
        this.processingSet = new Set();
        this.queuedSet = new Set();
    }

    add(bookId, options = {}) {
        const idStr = String(bookId);
        if (this.processingSet.has(idStr) || this.queuedSet.has(idStr)) {
            return false;
        }

        this.queuedSet.add(idStr);
        this.queue.push({ bookId: idStr, options });
        this.emit('jobAdded', idStr);
        process.nextTick(() => this._processNext());
        return true;
    }

    isBusy(bookId) {
        const idStr = String(bookId);
        return this.processingSet.has(idStr) || this.queuedSet.has(idStr);
    }

    async _processNext() {
        if (this.activeCount >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const { bookId, options } = this.queue.shift();
        this.queuedSet.delete(bookId);
        this.processingSet.add(bookId);
        this.activeCount += 1;

        try {
            await this._executeParseJob(bookId, options);
        } catch (err) {
            console.error(`[EpubParseQueue] Job unhandled error for book ${bookId}:`, err);
        } finally {
            this.processingSet.delete(bookId);
            this.activeCount -= 1;
            process.nextTick(() => this._processNext());
        }
    }

    async _executeParseJob(bookId, options = {}) {
        console.log(`[EpubParseQueue] Starting parse job for book: ${bookId}`);

        let book = null;
        try {
            book = await Book.findById(bookId);
            if (!book) {
                console.warn(`[EpubParseQueue] Book ${bookId} not found in DB`);
                return;
            }

            if (book.fileType !== 'epub') {
                console.log(`[EpubParseQueue] Book ${bookId} is not an EPUB (${book.fileType}), skipping`);
                await Book.findByIdAndUpdate(bookId, { parseStatus: 'completed', parseError: null });
                return;
            }

            await Book.findByIdAndUpdate(bookId, { parseStatus: 'processing', parseError: null });

            const sourceUrlOrPath = options.filePath || book.fileUrl;
            if (!sourceUrlOrPath) {
                throw new Error('No fileUrl or local filePath found for EPUB');
            }

            const parsed = await parseEpub(sourceUrlOrPath);

            // Delete any existing chapters for this book to avoid duplicates
            await Chapter.deleteMany({ book: book._id });

            if (parsed.chapters && parsed.chapters.length > 0) {
                const chapterDocs = parsed.chapters.map((ch) => ({
                    book: book._id,
                    bookSlug: book.slug,
                    chapterNumber: ch.chapterNumber,
                    chapterTitle: ch.chapterTitle,
                    paragraphs: ch.paragraphs,
                    quotes: ch.quotes,
                    pullQuote: ch.pullQuote,
                    wordCount: ch.wordCount,
                    readingTimeMinutes: ch.readingTimeMinutes,
                    sourceHref: ch.sourceHref,
                }));

                await Chapter.insertMany(chapterDocs);
            }

            await Book.findByIdAndUpdate(bookId, {
                parseStatus: 'completed',
                parseError: null,
                totalChapters: parsed.totalChapters || 0,
            });

            console.log(`[EpubParseQueue] Successfully parsed book: ${book.title} (${parsed.totalChapters} chapters)`);
            this.emit('jobCompleted', { bookId, totalChapters: parsed.totalChapters });
        } catch (err) {
            console.error(`[EpubParseQueue] Failed to parse book ${bookId}:`, err.message);
            await Book.findByIdAndUpdate(bookId, {
                parseStatus: 'failed',
                parseError: err.message || 'Failed to parse EPUB archive',
            });
            this.emit('jobFailed', { bookId, error: err.message });
        }
    }
}

const defaultConcurrency = process.env.EPUB_PARSE_CONCURRENCY
    ? Math.max(1, parseInt(process.env.EPUB_PARSE_CONCURRENCY, 10) || 2)
    : 2;

const epubParseQueue = new EpubParseQueue(defaultConcurrency);

module.exports = epubParseQueue;
