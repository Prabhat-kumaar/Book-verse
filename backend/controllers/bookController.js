const Book = require('../models/Book');

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

// Format URL: dynamically generate correct URLs for any host
const formatUrl = (req, urlValue) => {
    const value = asTrimmedString(urlValue);
    if (!value) return '';

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    console.log(`[formatUrl] Input: ${value} | baseUrl: ${baseUrl}`);

    // If it's a full URL, replace localhost/127.0.0.1 with current host
    if (/^https?:\/\//i.test(value)) {
        const currentHost = req.get('host').split(':')[0]; // Get host without port
        const normalizedUrl = value.replace(/localhost|127\.0\.0\.1/g, currentHost);
        console.log(`[formatUrl] Full URL normalized -> Result: ${normalizedUrl}`);
        return normalizedUrl;
    }

    // If it's already a path with /uploads, prepend baseUrl
    if (value.startsWith('/uploads/')) {
        const result = `${baseUrl}${value}`;
        console.log(`[formatUrl] /uploads path detected -> Result: ${result}`);
        return result;
    }

    // If plain filename, assume it belongs in /uploads
    const result = `${baseUrl}/uploads/${value}`;
    console.log(`[formatUrl] Plain filename detected -> Result: ${result}`);
    return result;
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
        const title = asTrimmedString(req.body.title);
        const author = asTrimmedString(req.body.author);
        const category = asTrimmedString(req.body.category);

        const fileUrlInput = asTrimmedString(req.body.fileUrl) || asTrimmedString(req.body.pdf);
        const thumbnailUrlInput = asTrimmedString(req.body.thumbnail);

        const uploadFile = req.files?.file?.[0] || req.files?.pdf?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

        let fileUrl = fileUrlInput;
        let thumbnail = thumbnailUrlInput;

        // If files were uploaded, use only the filename (not the full URL)
        if (uploadFile) {
            fileUrl = uploadFile.filename;
        } else if (fileUrlInput && /^https?:\/\//i.test(fileUrlInput)) {
            // If fileUrl is a URL, extract just the filename
            try {
                const url = new URL(fileUrlInput);
                fileUrl = url.pathname.split('/').pop();
            } catch {
                fileUrl = fileUrlInput.split('/').pop();
            }
        }

        if (thumbnailFile) {
            thumbnail = thumbnailFile.filename;
        } else if (thumbnailUrlInput && /^https?:\/\//i.test(thumbnailUrlInput)) {
            // If thumbnail is a URL, extract just the filename
            try {
                const url = new URL(thumbnailUrlInput);
                thumbnail = url.pathname.split('/').pop();
            } catch {
                thumbnail = thumbnailUrlInput.split('/').pop();
            }
        }

        const fileType = getFileTypeFromPathOrMime(fileUrl, uploadFile?.mimetype);
        const pdf = fileType === 'pdf' ? fileUrl : '';

        if (!title || !author || !category || !fileUrl || !thumbnail) {
            return res.status(400).json({ success: false, message: 'All book fields are required and cannot be empty' });
        }

        const book = await Book.create({ title, author, category, fileUrl, fileType, pdf, thumbnail });
        const formattedBook = {
            ...book._doc,
            fileUrl: formatUrl(req, book.fileUrl),
            thumbnail: formatUrl(req, book.thumbnail)
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

const getAllBooks = async (req, res, next) => {
    try {
        const { category } = req.query;
        const filter = category ? { category: { $regex: new RegExp(category.trim(), 'i') } } : {};
        const books = await Book.find(filter).sort({ createdAt: -1 });
        const formattedBooks = books.map(book => ({
            ...book._doc,
            fileUrl: formatUrl(req, book.fileUrl),
            thumbnail: formatUrl(req, book.thumbnail)
        }));
        res.json({ success: true, count: formattedBooks.length, data: formattedBooks });
    } catch (error) {
        next(error);
    }
};

const getBooksByCategory = async (req, res, next) => {
    try {
        const { category } = req.params;
        const categoryRegex = new RegExp(escapeRegex(category.trim()), 'i');
        const books = await Book.find({ category: { $regex: categoryRegex } });
        const formattedBooks = books.map(book => ({
            ...book._doc,
            fileUrl: formatUrl(req, book.fileUrl),
            thumbnail: formatUrl(req, book.thumbnail)
        }));
        res.json({ success: true, count: formattedBooks.length, data: formattedBooks });
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
            fileUrl: formatUrl(req, book.fileUrl),
            thumbnail: formatUrl(req, book.thumbnail)
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

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }

        book.title = title || book.title;
        book.author = author || book.author;
        book.category = category || book.category;

        const nextFileUrl = rawFileUrl || pdf || book.fileUrl || book.pdf;
        const nextFileType = rawFileType || getFileTypeFromPathOrMime(nextFileUrl);
        book.fileUrl = nextFileUrl;
        book.fileType = nextFileType;
        book.pdf = nextFileType === 'pdf' ? nextFileUrl : '';
        book.thumbnail = thumbnail || book.thumbnail;

        const updatedBook = await book.save();
        const formattedBook = {
            ...updatedBook._doc,
            fileUrl: formatUrl(req, updatedBook.fileUrl),
            thumbnail: formatUrl(req, updatedBook.thumbnail)
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
