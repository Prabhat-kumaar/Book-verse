const Book = require('../models/Book');
const { cloudinary, uploadToCloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');
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

const uploadOrLocalFilename = async (file, folder) => {
    if (!file) return '';
    if (!isCloudinaryConfigured) return file.filename;

    try {
        const uploadedUrl = await uploadToCloudinary(file.path, folder);
        return uploadedUrl || file.filename;
    } catch (cloudinaryError) {
        devError(`[Cloudinary] Falling back to local upload for ${file.filename}:`, cloudinaryError.message);
        return file.filename;
    }
};

const extractCloudinaryPublicId = (urlValue = '', options = {}) => {
    const raw = asTrimmedString(urlValue);
    if (!raw || !raw.includes('cloudinary.com')) return null;

    try {
        const parsed = new URL(raw);
        const match = parsed.pathname.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+)$/);
        if (!match?.[1]) return null;
        const publicId = decodeURIComponent(match[1]);
        return options.resource_type === 'raw' ? publicId : publicId.replace(/\.[^/.]+$/, '');
    } catch {
        return null;
    }
};

const destroyCloudinaryAsset = async (urlValue, options = {}) => {
    if (!isCloudinaryConfigured) return;

    const publicId = extractCloudinaryPublicId(urlValue, options);
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId, options);
    } catch (cloudinaryError) {
        devError(`[Cloudinary] Failed to delete ${publicId}:`, cloudinaryError.message);
    }
};

const shouldDestroyAsRaw = (urlValue = '', fileType = '') => (
    fileType === 'epub' || getFileTypeFromPathOrMime(urlValue) === 'epub'
);

const getCloudinaryDestroyOptions = (urlValue = '', fileType = '') => {
    const raw = asTrimmedString(urlValue);
    if (raw.includes('/raw/upload/')) return { resource_type: 'raw' };
    if (raw.includes('/image/upload/')) return { resource_type: 'image' };
    return shouldDestroyAsRaw(raw, fileType) ? { resource_type: 'raw' } : {};
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

    if (value.startsWith('https://res.cloudinary.com') || value.includes('cloudinary.com')) {
        return value;
    }

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
    const coverImage = toCanonicalUploadUrl(req, source.coverImage || '');
    const fileType = source.fileType || getFileTypeFromPathOrMime(fileUrl);
    const filename = source.filename || extractFilename(fileUrl);
    return {
        ...source,
        fileUrl,
        filename,
        thumbnail,
        coverImage: coverImage || thumbnail,
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

        // 1. Validation: Cover image is required
        if (!thumbnailFile && !thumbnailUrlInput) {
            return res.status(400).json({ success: false, message: 'Cover image is required' });
        }

        // 2. Validation: Book file is required
        if (!uploadFile && !fileUrlInput) {
            return res.status(400).json({ success: false, message: 'Book file is required' });
        }

        let fileUrl = fileUrlInput;
        let thumbnail = thumbnailUrlInput;
        let coverImage = thumbnailUrlInput || '';

        // 3. Upload EPUB/PDF to Cloudinary
        if (uploadFile) {
            fileUrl = await uploadOrLocalFilename(uploadFile, 'readifyai/books');
        }

        // 4. Upload Cover Image to Cloudinary
        if (thumbnailFile) {
            thumbnail = await uploadOrLocalFilename(thumbnailFile, 'readifyai/thumbnails');
            coverImage = thumbnail;
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

        const description = validate.sanitize(req.body.description, 2000);
        const language = validate.sanitize(req.body.language, 100);
        const difficulty = validate.sanitize(req.body.difficulty, 50);

        let tags = [];
        if (req.body.tags) {
            try {
                const parsed = JSON.parse(req.body.tags);
                if (Array.isArray(parsed)) {
                    tags = parsed;
                } else if (typeof req.body.tags === 'string') {
                    tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
                }
            } catch {
                if (typeof req.body.tags === 'string') {
                    tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
                }
            }
        }

        const book = await Book.create({
            title,
            author,
            category,
            description,
            tags,
            language,
            difficulty,
            fileUrl,
            fileType,
            pdf,
            thumbnail,
            coverImage
        });

        const formattedBook = {
            ...book._doc,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null,
            coverImage: book.coverImage ? formatUrl(req, book.coverImage) : null
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
    const limit = Math.min(200, parseInt(query.limit, 10) || 100);
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
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
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
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
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
    const paramId = req.params.id;
    devLog(`[DEBUG] getBookById - Incoming parameter: "${paramId}"`);
    try {
        devLog(`[DEBUG] getBookById - Querying MongoDB: Book.findById("${paramId}")`);
        const book = await Book.findById(paramId);
        devLog(`[DEBUG] getBookById - Query successful. Book found: ${!!book}`);
        if (!book) {
            devLog(`[DEBUG] getBookById - Sending 404 response: Book not found`);
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        const formattedBook = {
            ...book._doc,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null,
            coverImage: book.coverImage ? formatUrl(req, book.coverImage) : null
        };
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        devLog(`[DEBUG] getBookById - Sending 200 response with data`);
        res.json({ success: true, data: formattedBook });
    } catch (error) {
        console.error(`[DEBUG] getBookById - Error caught:`, error);
        next(error);
    }
};

const getBookBySlug = async (req, res, next) => {
    const paramSlug = req.params.slug;
    devLog(`[DEBUG] getBookBySlug - Incoming parameter: "${paramSlug}"`);
    try {
        const slug = asTrimmedString(paramSlug).toLowerCase();
        devLog(`[DEBUG] getBookBySlug - Querying MongoDB: Book.findOne({ slug: "${slug}" })`);
        const book = await Book.findOne({ slug });
        devLog(`[DEBUG] getBookBySlug - Query successful. Book found: ${!!book}`);
        if (!book) {
            devLog(`[DEBUG] getBookBySlug - Sending 404 response: Book not found`);
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        const formattedBook = {
            ...book._doc,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null,
            coverImage: book.coverImage ? formatUrl(req, book.coverImage) : null
        };
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
        devLog(`[DEBUG] getBookBySlug - Sending 200 response with data`);
        res.json({ success: true, data: formattedBook });
    } catch (error) {
        console.error(`[DEBUG] getBookBySlug - Error caught:`, error);
        next(error);
    }
};

const updateBook = async (req, res, next) => {
    try {
        const bookId = req.params.id;
        const { title, author, category, fileUrl: rawFileUrl, fileType: rawFileType, pdf, thumbnail, description, tags, language, difficulty } = req.body;
        const uploadFile = req.files?.file?.[0] || req.files?.pdf?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];

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
        const cleanDescription = description !== undefined ? validate.sanitize(description, 2000) : undefined;
        const cleanLanguage = language !== undefined ? validate.sanitize(language, 100) : undefined;
        const cleanDifficulty = difficulty !== undefined ? validate.sanitize(difficulty, 50) : undefined;

        let cleanTags = undefined;
        if (tags !== undefined) {
            try {
                const parsed = typeof tags === 'string' ? JSON.parse(tags) : tags;
                if (Array.isArray(parsed)) {
                    cleanTags = parsed;
                } else if (typeof tags === 'string') {
                    cleanTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
                }
            } catch {
                if (typeof tags === 'string') {
                    cleanTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
                }
            }
        }

        book.title = cleanTitle || book.title;
        book.author = cleanAuthor || book.author;
        book.category = cleanCategory || book.category;
        if (cleanDescription !== undefined) book.description = cleanDescription;
        if (cleanLanguage !== undefined) book.language = cleanLanguage;
        if (cleanDifficulty !== undefined) book.difficulty = cleanDifficulty;
        if (cleanTags !== undefined) book.tags = cleanTags;

        let nextFileUrl = cleanFileUrl || book.fileUrl || book.pdf;
        if (uploadFile) {
            const destroyOptions = getCloudinaryDestroyOptions(book.fileUrl || book.pdf, book.fileType);
            await destroyCloudinaryAsset(book.fileUrl || book.pdf, destroyOptions);
            nextFileUrl = await uploadOrLocalFilename(uploadFile, 'readifyai/books');
        }
        const nextFileType = rawFileType || getFileTypeFromPathOrMime(nextFileUrl);
        book.fileUrl = nextFileUrl;
        book.fileType = nextFileType;
        book.pdf = nextFileType === 'pdf' ? nextFileUrl : '';
        let nextThumbnail = cleanThumbnail || book.thumbnail;
        if (thumbnailFile) {
            await destroyCloudinaryAsset(book.thumbnail);
            nextThumbnail = await uploadOrLocalFilename(thumbnailFile, 'readifyai/thumbnails');
        }
        book.thumbnail = nextThumbnail;
        book.coverImage = nextThumbnail || book.coverImage;

        const updatedBook = await book.save();
        const formattedBook = {
            ...updatedBook._doc,
            fileUrl: updatedBook.fileUrl ? formatUrl(req, updatedBook.fileUrl) : null,
            thumbnail: updatedBook.thumbnail ? formatUrl(req, updatedBook.thumbnail) : null,
            coverImage: updatedBook.coverImage ? formatUrl(req, updatedBook.coverImage) : null
        };
        res.json({ success: true, data: formattedBook });
    } catch (error) {
        next(error);
    }
};

const getRecommendations = async (req, res, next) => {
    try {
        const books = await Book.find().sort({ averageRating: -1, createdAt: -1 }).limit(12);
        const formattedBooks = books.map(book => ({
            ...book._doc,
            fileUrl: book.fileUrl ? formatUrl(req, book.fileUrl) : null,
            thumbnail: book.thumbnail ? formatUrl(req, book.thumbnail) : null,
            coverImage: book.coverImage ? formatUrl(req, book.coverImage) : null
        }));
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json({ success: true, data: formattedBooks });
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

        console.log('[Cloudinary] deleteBook fileUrl:', book.fileUrl || book.pdf || '');
        await destroyCloudinaryAsset(
            book.fileUrl || book.pdf,
            getCloudinaryDestroyOptions(book.fileUrl || book.pdf, book.fileType)
        );
        await destroyCloudinaryAsset(book.thumbnail);
        
        // Auto-cleanup orphaned progress records for the deleted book
        const Progress = require('../models/Progress');
        await Progress.deleteMany({ book: bookId });

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
    getBookBySlug,
    updateBook,
    deleteBook,
    getRecommendations,
};
