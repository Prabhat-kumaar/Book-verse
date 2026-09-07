const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_BOOK_EXTS = new Set(['.pdf', '.epub']);
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const rawExt = path.extname(file.originalname || '').toLowerCase();
        const ext = ALLOWED_BOOK_EXTS.has(rawExt) || ALLOWED_IMAGE_EXTS.has(rawExt) ? rawExt : '';
        const base = path.basename(file.originalname || 'file', rawExt).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
        cb(null, `${Date.now()}-${base}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (file.fieldname === 'file' || file.fieldname === 'pdf') {
        if (!ALLOWED_BOOK_EXTS.has(ext)) {
            const err = new Error(`Only .pdf and .epub file extensions are permitted (received: ${ext || 'unknown'})`);
            err.statusCode = 400;
            return cb(err);
        }

        return cb(null, true);
    }

    if (file.fieldname === 'thumbnail') {
        if (!ALLOWED_IMAGE_EXTS.has(ext)) {
            const err = new Error(`Only .jpg, .jpeg, .png, .webp, and .avif image files are allowed for cover (received: ${ext || 'unknown'})`);
            err.statusCode = 400;
            return cb(err);
        }

        return cb(null, true);
    }

    const err = new Error(`Unexpected upload field: ${file.fieldname}`);
    err.statusCode = 400;
    return cb(err);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 200, // 200MB max book size
        files: 5,
    },
});

module.exports = upload;

