const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();
const isDev = process.env.NODE_ENV !== 'production';
const devLog = (...args) => isDev && console.log(...args);
const devError = (...args) => console.error(...args);

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
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'blob:'],
                connectSrc: ["'self'", 'https://book-verse-production.up.railway.app'],
                frameSrc: ["'self'", 'blob:'],
                objectSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ================= MIDDLEWARE =================
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://book-verse.vercel.app',
    'https://book-verse-git-master.vercel.app',
    'https://book-verse-flax-one.vercel.app',
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error(`CORS policy: origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => apiResponse.error(res, 'Too many requests, please try again later.', 429),
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => apiResponse.error(res, 'Too many auth attempts, please try again in 15 minutes.', 429),
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
            if (ext === '.epub') res.setHeader('Content-Type', 'application/epub+zip');
            if (ext === '.pdf') res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'public, max-age=86400');
        },
    })
);

// Safe explicit download/access endpoint for uploaded files.
app.get('/uploads/:filename', (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.filename || '');
        const safeFilename = path.basename(raw);
        if (!safeFilename || safeFilename !== raw) {
            return apiResponse.error(res, 'Invalid filename', 400);
        }

        const absolutePath = path.resolve(uploadsDir, safeFilename);
        const insideUploads = absolutePath.startsWith(path.resolve(uploadsDir) + path.sep);
        if (!insideUploads) {
            return apiResponse.error(res, 'Invalid file path', 400);
        }

        if (!fs.existsSync(absolutePath)) {
            return apiResponse.notFound(res, 'File');
        }

        return res.sendFile(absolutePath, (err) => {
            if (err && !res.headersSent) {
                return apiResponse.error(res, 'Unable to serve file', 500);
            }
            return undefined;
        });
    } catch (_error) {
        return apiResponse.error(res, 'Failed to process file request', 500);
    }
});

// ================= BASIC ROUTE =================
app.get('/', (req, res) => {
    res.json({ message: 'Book Reading System API is running' });
});

// ================= API ROUTES =================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', (req, res, next) => {
    const isSavedRoute =
        req.path === '/collections' ||
        req.path.startsWith('/collections/') ||
        req.path === '/saved-books' ||
        req.path.startsWith('/saved-books/');

    if (isSavedRoute) {
        return next();
    }

    return apiResponse.error(res, `Route ${req.originalUrl} not found`, 404);
});
app.use('/api', savedRoutes);

// ================= 404 HANDLER =================
app.use('*', (req, res) => {
    apiResponse.error(res, `Route ${req.originalUrl} not found`, 404);
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
    const currentIsDev = process.env.NODE_ENV !== 'production';

    if (currentIsDev) {
        console.error('Unhandled error:', err);
    }

    if (err.type === 'entity.too.large') {
        return apiResponse.error(
            res,
            'Request entity too large. Reduce file size or switch to chunked upload.',
            413,
            currentIsDev ? err.message : null
        );
    }

    if (err.name === 'ValidationError') {
        return apiResponse.error(res, 'Validation error', 400, currentIsDev ? err.message : null);
    }

    if (err.name === 'CastError') {
        return apiResponse.error(res, 'Invalid ID format', 400);
    }

    if (err.message?.includes('CORS')) {
        return apiResponse.error(res, 'CORS policy violation', 403);
    }

    return apiResponse.error(res, 'Internal server error', 500, currentIsDev ? err.message : null);
});

// ================= START SERVER =================
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;
const MAX_PORT = DEFAULT_PORT + 5;
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);

const startServer = (port) => {
    const server = http.createServer(app);

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            const nextPort = port + 1;
            if (!isRailway && nextPort <= MAX_PORT) {
                console.warn(`Port ${port} is already in use. Trying port ${nextPort}...`);
                startServer(nextPort);
                return;
            }
            if (isRailway) {
                devError(`Port ${port} is already in use.`);
            } else {
                devError(`Port ${port} is already in use. Tried ports ${DEFAULT_PORT}-${MAX_PORT}. Set a different PORT and restart.`);
            }
        } else {
            devError('Server startup error:', error);
        }
        process.exit(1);
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`
========================================
  Book-verse API Server
  Environment : ${process.env.NODE_ENV || 'development'}
  Port        : ${port}
  MongoDB     : Connected
  Started at  : ${new Date().toISOString()}
========================================
        `.trim());

        if (isDev) {
            console.log(`Local: http://localhost:${port}/api`);
        }
    });
};

const bootstrap = async () => {
    try {
        await connectDB();
        startServer(DEFAULT_PORT);
    } catch (error) {
        devError('Failed to start application:', error.message);
        process.exit(1);
    }
};

bootstrap();
