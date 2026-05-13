const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '');
        const base = path.basename(file.originalname || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '-');
        cb(null, `${Date.now()}-${base}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    if (file.fieldname === 'file' || file.fieldname === 'pdf') {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';
        const isEpub = file.mimetype === 'application/epub+zip' || ext === '.epub';
        if (isPdf || isEpub) {
            return cb(null, true);
        }
        return cb(new Error('Only PDF/EPUB files are allowed for file'));
    }

    if (file.fieldname === 'thumbnail') {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        return cb(new Error('Only image files are allowed for thumbnail'));
    }

    return cb(null, false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 200,
    },
});

module.exports = upload;
