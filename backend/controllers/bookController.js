const Book = require('../models/Book');
const validate = require('../utils/validate');
const isDev = process.env.NODE_ENV !== 'production';
const devLog = (...args) => isDev && console.log(...args);
const devError = (...args) => console.error(...args);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const getServerBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const toFileUrl = (req, file) => `${getServerBaseUrl(req)}/uploads/${file.filename}`;
const extractFilename = (value = '') => {
    const raw = (value || '').trim();
    if (!raw) return '';
    try {
        const maybeUrl = new URL(raw);
        const pathname = maybeUrl.pathname || '';
        return pathname.split('/').filter(Boolean).pop() || '';
    } catch {
        return raw.split('/').filter(Boolean).pop() || '';
    }
};
const toCanonicalUploadUrl = (req, rawValue = '') => {
    const raw = asTrimmedString(rawValue);
    if (!raw) return '';
    if (/^(blob:|data:)/i.test(raw)) return raw;
    const filename = extractFilename(raw);
    if (!filename) return raw;

    if (/^https?:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw);
            if (parsed.pathname.includes('/uploads/')) {
                return `${getServerBaseUrl(req)}/uploads/${filename}`;
            }
            return raw;
        } catch {
            return raw;
        }
    }

    if (raw.startsWith('/uploads/') || raw.startsWith('uploads/')) {
        return `${getServerBaseUrl(req)}/uploads/${filename}`;
    }

    return raw;
};

const getFileTypeFromPathOrMime = (rawUrl = '', mime = '') => {
    const url = rawUrl.toLowerCase();
    const normalizedMime = (mime || '').toLowerCase();
    if (url.endsWith('.epub') || normalizedMime.includes('epub')) return 'epub';
    return 'pdf';
};

const normalizeBackendOrigin = (value = '') => {
    const raw = asTrimmedString(value).replace(/\/+$/, '');
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
};

// Format URL: preserve external URLs and only rewrite explicit local hosts.
const formatUrl = (req, urlValue) => {
    const value = asTrimmedString(urlValue);
    if (!value) return '';

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const backendUrl = normalizeBackendOrigin(
        process.env.BACKEND_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.RAILWAY_STATIC_URL ||
        ''
    );

    if (/^https?:\/\//i.test(value)) {
        const isLocalUrl =
            value.startsWith('http://localhost') ||
            value.startsWith('http://127.0.0.1') ||
            value.startsWith('https://localhost') ||
            value.startsWith('https://127.0.0.1');

        if (!isLocalUrl) return value;
        if (!backendUrl) return value;

        try {
            const parsed = new URL(value);
            return `${backendUrl}${parsed.pathname}${parsed.search || ''}`;
        } catch {
            return value;
        }
    }

    if (value.startsWith('/uploads/')) return `${baseUrl}${value}`;
    if (value.startsWith('uploads/')) return `${baseUrl}/${value}`;
    return `${baseUrl}/uploads/${value}`;
};

const normalizeBookPayload = (req, bookDoc) => {
    const source = bookDoc.toObject ? bookDoc.toObject() : bookDoc;
    const fileUrlRaw = source.fileUrl || source.pdf || '';
    const fileUrl = toCanonicalUploadUrl(req, fileUrlRaw);
    const thumbnail = toCanonicalUploadUrl(req, source.thumbnail || '');
    const fileType = source.fileType || getFileTypeFromPathOrMime(fileUrl);
    const filename = source.filename || extractFilename(fileUrl);
    return {
        ...source,
        fileUrl,
        filename,
        thumbnail,
        fileType,
        pdf: source.pdf || (fileType === 'pdf' ? fileUrl : source.pdf),
    };
};

const addBook = async (req, res, next) => {
    try {
        const title = validate.sanitize(req.body.title, 200);
        const author = validate.sanitize(req.body.author, 200);
        const category = validate.sanitize(req.body.category, 100);

        const fileUrlInput = validate.sanitize(req.body.fileUrl || req.body.pdf, 500);
        const thumbnailUrlInput = validate.sanitize(req.body.thumbnail, 500);

        const uploadFile = req.files?.file?.[0] || req.files?.pdf?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        let fileUrl = fileUrlInput;
        let thumbnail = thumbnailUrlInput;

        // If files were uploaded, use only the filename (not the full URL)
        if (uploadFile) {
            fileUrl = uploadFile.filename;
        }

        if (thumbnailFile) {
            thumbnail = thumbnailFile.filename;
        }

        const fileType = getFileTypeFromPathOrMime(fileUrl, uploadFile?.mimetype);
        const pdf = fileType === 'pdf' ? fileUrl : '';

        const requiredCheck = validate.required(
            { title, author, category, fileUrl, thumbnail },
            ['title', 'author', 'category', 'fileUrl', 'thumbnail']
        );

        if (!requiredCheck.valid) {
            return res.status(400).json({ success: false, message: requiredCheck.message });
        }

        const book = await Book.create({ title, author, category, fileUrl, fileType, pdf, thumbnail });
        const formattedBook = {
            ...book._doc,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null
        };
        res.status(201).json({ success: true, data: formattedBook });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({ success: false, message: 'Validation error', errors: messages });
        }
        next(error);
    }
};

const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, parseInt(query.limit, 10) || 12);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const getAllBooks = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query || {});
        const { category } = req.query;
        const filter = category ? { category: { $regex: new RegExp(category.trim(), 'i') } } : {};
        const [books, total] = await Promise.all([
            Book.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Book.countDocuments(filter),
        ]);

        const formattedBooks = books.map((book) => ({
            ...book,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null,
            coverImage: book.coverImage ? formatUrl(req, book.coverImage) : null,
        }));
        res.json({
            success: true,
            books: formattedBooks,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getBooksByCategory = async (req, res, next) => {
    try {
        const { page, limit, skip } = parsePagination(req.query || {});
        const { category } = req.params;
        const categoryRegex = new RegExp(escapeRegex(category.trim()), 'i');
        const filter = { category: { $regex: categoryRegex } };
        const [books, total] = await Promise.all([
            Book.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Book.countDocuments(filter),
        ]);

        const formattedBooks = books.map((book) => ({
            ...book,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null,
            coverImage: book.coverImage ? formatUrl(req, book.coverImage) : null,
        }));
        res.json({
            success: true,
            books: formattedBooks,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getBookById = async (req, res, next) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        const formattedBook = {
            ...book._doc,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null
        };
        res.json({ success: true, data: formattedBook });
    } catch (error) {
        next(error);
    }
};

const updateBook = async (req, res, next) => {
    try {
        const bookId = req.params.id;
        const { title, author, category, fileUrl: rawFileUrl, fileType: rawFileType, pdf, thumbnail } = req.body;

        if (!validate.objectId(bookId)) {
            return res.status(400).json({ success: false, message: 'Invalid ID format' });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        const cleanTitle = title !== undefined ? validate.sanitize(title, 200) : '';
        const cleanAuthor = author !== undefined ? validate.sanitize(author, 200) : '';
        const cleanCategory = category !== undefined ? validate.sanitize(category, 100) : '';
        const cleanFileUrl = validate.sanitize(rawFileUrl || pdf, 500);
        const cleanThumbnail = validate.sanitize(thumbnail, 500);

        book.title = cleanTitle || book.title;
        book.author = cleanAuthor || book.author;
        book.category = cleanCategory || book.category;

        const nextFileUrl = cleanFileUrl || book.fileUrl || book.pdf;
        const nextFileType = rawFileType || getFileTypeFromPathOrMime(nextFileUrl);
        book.fileUrl = nextFileUrl;
        book.fileType = nextFileType;
        book.pdf = nextFileType === 'pdf' ? nextFileUrl : '';
        book.thumbnail = cleanThumbnail || book.thumbnail;

        const updatedBook = await book.save();
        const formattedBook = {
            ...updatedBook._doc,
            fileUrl: updatedBook.fileUrl ? formatUrl(req, updatedBook.fileUrl) : null,
            thumbnail: updatedBook.thumbnail ? formatUrl(req, updatedBook.thumbnail) : null
        };
        res.json({ success: true, data: formattedBook });
    } catch (error) {
        next(error);
    }
};

const deleteBook = async (req, res, next) => {
    try {
        const bookId = req.params.id;
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        await Book.findByIdAndDelete(bookId);
        return res.status(200).json({ success: true, message: "Book deleted" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addBook,
    getAllBooks,
    getBooksByCategory,
    getBookById,
    updateBook,
    deleteBook,
};
