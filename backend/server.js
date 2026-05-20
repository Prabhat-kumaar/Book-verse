const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';

const connectDB = require('./config/db');
const apiResponse = require('./utils/apiResponse');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bookRoutes = require('./routes/bookRoutes');
const progressRoutes = require('./routes/progressRoutes');
const savedRoutes = require('./routes/savedRoutes');
const streakRoutes = require('./routes/streakRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error('Missing required environment variable: JWT_SECRET');
}

const app = express();

// ================= DIRECTORIES =================
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// ================= TRUST PROXY =================
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= HELPERS =================
const parseCsvEnv = (value = '') =>
    String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

// ================= CORS =================
const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'https://readifyai.vercel.app',
];

const envAllowedOrigins = parseCsvEnv(process.env.FRONTEND_URL);

const allowedOrigins = [
    ...new Set([...defaultAllowedOrigins, ...envAllowedOrigins]),
];

const allowedOriginPatterns = [
    /^https:\/\/([a-z0-9-]+)\.vercel\.app$/i,
];

const isAllowedOrigin = (origin = '') => {
    return (
        allowedOrigins.includes(origin) ||
        allowedOriginPatterns.some((pattern) => pattern.test(origin))
    );
};

const corsOptions = {
    origin: (origin, callback) => {
        console.log('Incoming Origin:', origin);

        // allow mobile apps/postman
        if (!origin) {
            return callback(null, true);
        }

        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        console.warn(`CORS blocked origin: ${origin}`);

        return callback(new Error(`CORS policy violation: ${origin}`));
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
    ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ================= HELMET =================
const backendPublicOrigin =
    (
        process.env.BACKEND_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.RAILWAY_STATIC_URL ||
        ''
    )
        .trim()
        .replace(/\/+$/, '');

const connectSrc = [
    "'self'",
    'https://readifyai.vercel.app',
    ...(backendPublicOrigin ? [backendPublicOrigin] : []),
];

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://fonts.googleapis.com',
                ],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: [
                    "'self'",
                    'data:',
                    'blob:',
                    'https://res.cloudinary.com',
                ],
                connectSrc,
                frameSrc: ["'self'", 'blob:'],
                objectSrc: ["'none'"],
            },
        },

        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: {
            policy: 'cross-origin',
        },
    })
);

// ================= BODY PARSER =================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================= RATE LIMIT =================
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (_req, res) => {
        return apiResponse.error(
            res,
            'Too many requests, try again later.',
            429
        );
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (_req, res) => {
        return apiResponse.error(
            res,
            'Too many login attempts.',
            429
        );
    },
});

app.use('/api', generalLimiter);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ================= STATIC FILES =================
app.use(
    '/uploads',
    express.static(uploadsDir, {
        index: false,

        setHeaders: (res, filePath) => {
            const ext = path.extname(filePath).toLowerCase();

            if (ext === '.epub') {
                res.setHeader(
                    'Content-Type',
                    'application/epub+zip'
                );
            }

            if (ext === '.pdf') {
                res.setHeader(
                    'Content-Type',
                    'application/pdf'
                );
            }

            res.setHeader(
                'X-Content-Type-Options',
                'nosniff'
            );

            res.setHeader(
                'Cache-Control',
                'public, max-age=86400'
            );
        },
    })
);

// ================= FILE ACCESS =================
app.get('/uploads/:filename', (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.filename || '');

        const safeFilename = path.basename(raw);

        if (!safeFilename || safeFilename !== raw) {
            return apiResponse.error(
                res,
                'Invalid filename',
                400
            );
        }

        const absolutePath = path.resolve(
            uploadsDir,
            safeFilename
        );

        if (!fs.existsSync(absolutePath)) {
            return apiResponse.notFound(res, 'File');
        }

        return res.sendFile(absolutePath);
    } catch (error) {
        return apiResponse.error(
            res,
            'Failed to access file',
            500
        );
    }
});

// ================= ROOT =================
app.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'Readify API Running',
    });
});

// ================= API ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', savedRoutes);

// ================= API 404 =================
app.use('/api', (req, res) => {
    return apiResponse.error(
        res,
        `API Route ${req.originalUrl} not found`,
        404
    );
});

// ================= GLOBAL 404 =================
app.use('*', (req, res) => {
    return apiResponse.error(
        res,
        `Route ${req.originalUrl} not found`,
        404
    );
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);

    if (err.type === 'entity.too.large') {
        return apiResponse.error(
            res,
            'Request too large',
            413
        );
    }

    if (err.name === 'ValidationError') {
        return apiResponse.error(
            res,
            'Validation Error',
            400,
            isDev ? err.message : null
        );
    }

    if (err.name === 'CastError') {
        return apiResponse.error(
            res,
            'Invalid ID',
            400
        );
    }

    if (err.message?.includes('CORS')) {
        return apiResponse.error(
            res,
            'CORS policy violation',
            403
        );
    }

    return apiResponse.error(
        res,
        'Internal Server Error',
        500,
        isDev ? err.message : null
    );
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        http.createServer(app).listen(PORT, '0.0.0.0', () => {
            console.log(`
========================================
 Readify Backend Running
 Environment : ${process.env.NODE_ENV}
 Port        : ${PORT}
 MongoDB     : Connected
========================================
            `);
        });
    } catch (error) {
        console.error('MongoDB Connection Failed:', error.message);
        process.exit(1);
    }
};

startServer();