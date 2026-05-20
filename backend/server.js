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

// ================= CHECK ENV =================
if (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim()) {
    throw new Error('Missing JWT_SECRET');
}

const app = express();

// ================= DIRECTORIES =================
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// ================= BASIC SETTINGS =================
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= HELMET =================
app.use(
    helmet({
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: {
            policy: 'cross-origin',
        },
    })
);

// ================= CORS =================
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'https://readifyai.vercel.app',
    'https://book-verse.vercel.app',
];

app.use(
    cors({
        origin: function (origin, callback) {

            console.log('Incoming Origin:', origin);

            // Allow Postman/mobile apps
            if (!origin) {
                return callback(null, true);
            }

            // Allow localhost + vercel
            if (
                allowedOrigins.includes(origin) ||
                /\.vercel\.app$/.test(origin)
            ) {
                return callback(null, true);
            }

            console.log('CORS blocked origin:', origin);

            // IMPORTANT:
            // Don't block request hard
            return callback(null, true);
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
            'Origin',
            'Accept',
            'X-Requested-With',
        ],
    })
);

// ================= BODY PARSER =================
app.use(express.json({ limit: '10mb' }));

app.use(
    express.urlencoded({
        extended: true,
        limit: '10mb',
    })
);

// ================= RATE LIMIT =================
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (_req, res) => {
        return apiResponse.error(
            res,
            'Too many requests',
            429
        );
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (_req, res) => {
        return apiResponse.error(
            res,
            'Too many auth attempts',
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
        fallthrough: true,

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

        const raw = decodeURIComponent(
            req.params.filename || ''
        );

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
            'Failed to process file',
            500
        );
    }
});

// ================= ROOT =================
app.get('/', (_req, res) => {
    return res.json({
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
            'Validation error',
            400,
            isDev ? err.message : null
        );
    }

    if (err.name === 'CastError') {
        return apiResponse.error(
            res,
            'Invalid ID format',
            400
        );
    }

    return apiResponse.error(
        res,
        'Internal server error',
        500,
        isDev ? err.message : null
    );
});

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

const startServer = async () => {

    try {

        await connectDB();

        http.createServer(app).listen(
            PORT,
            '0.0.0.0',
            () => {

                console.log(`
========================================
 Readify API Server Running
 Environment : ${process.env.NODE_ENV}
 Port        : ${PORT}
 MongoDB     : Connected
========================================
                `);
            }
        );

    } catch (error) {

        console.error(
            'MongoDB connection failed:',
            error.message
        );

        process.exit(1);
    }
};

startServer();