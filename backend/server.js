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
const reviewRoutes = require('./routes/reviewRoutes');
const goalRoutes = require('./routes/goalRoutes');

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

const parseOriginList = (...values) => values
    .flatMap((value) => String(value || '').split(','))
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const allowedOrigins = new Set([
    ...parseOriginList(
        process.env.FRONTEND_URL,
        process.env.FRONTEND_URLS,
        process.env.CORS_ORIGINS
    ),
    'http://localhost:3000',
    'http://localhost:4173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
]);

const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '');

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        // 1. Check exact match in configured allowed origins
        if (allowedOrigins.has(normalizedOrigin)) {
            return callback(null, true);
        }

        // 2. Allow any Vercel deployment dynamically to prevent dynamic subdomain blockages
        if (normalizedOrigin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        // 3. Allow localhost/127.0.0.1 patterns dynamically for development
        if (/^https?:\/\/localhost(:\d+)?$/i.test(normalizedOrigin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(normalizedOrigin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'X-Requested-With'
    ]
}));
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
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => apiResponse.error(res, 'Too many requests', 429),
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => apiResponse.error(res, 'Too many auth attempts', 429),
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

const dbStateLabels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
};

app.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbStateLabels[dbState] || 'unknown';
    const healthy = dbStatus === 'connected';

    return res.status(healthy ? 200 : 503).json({
        success: healthy,
        service: 'Readify API',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatus,
            readyState: dbState,
            name: mongoose.connection.name || null,
            host: mongoose.connection.host || null,
        },
    });
});

// ================= API ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/goals', goalRoutes);
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
const errorMiddleware = require('./middleware/errorMiddleware');
app.use(errorMiddleware);

// ================= SERVER =================
const PORT = process.env.PORT || 5000;

const startServer = () => {
    const server = http.createServer(app);

    server.listen(
        PORT,
        '0.0.0.0',
        () => {
            console.log(`
========================================
 Readify API Server Running
 Environment : ${process.env.NODE_ENV}
 Port        : ${PORT}
 MongoDB     : ${dbStateLabels[mongoose.connection.readyState] || 'unknown'}
========================================
            `);
        }
    );

    connectDB().catch((error) => {
        console.error('MongoDB connection failed:', error.message);
    });

    const shutdown = () => {
        server.close(async () => {
            await mongoose.connection.close(false);
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};

startServer();
