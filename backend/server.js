console.log("🔥 SERVER UPDATED FILE RUNNING - Book Controller Fix Active");

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');

dotenv.config();

const connectDB = require('./config/db');

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

// ================= MIDDLEWARE =================
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
            return res.status(400).json({ message: 'Invalid filename' });
        }

        const absolutePath = path.resolve(uploadsDir, safeFilename);
        const insideUploads = absolutePath.startsWith(path.resolve(uploadsDir) + path.sep);
        if (!insideUploads) {
            return res.status(400).json({ message: 'Invalid file path' });
        }

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: `File not found: ${safeFilename}` });
        }

        return res.sendFile(absolutePath, (err) => {
            if (err && !res.headersSent) {
                return res.status(500).json({ message: 'Unable to serve file' });
            }
            return undefined;
        });
    } catch (_error) {
        return res.status(500).json({ message: 'Failed to process file request' });
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
app.use('/api', savedRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/analytics', analyticsRoutes);

// ================= 404 HANDLER =================
app.use((req, res) => {
    res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
});

// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            message: 'Request entity too large. Reduce file size or switch to chunked upload.',
        });
    }

    console.error(err.stack);
    res.status(500).json({
        message: err.message || 'Internal Server Error',
    });
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
                console.error(`Port ${port} is already in use.`);
            } else {
                console.error(`Port ${port} is already in use. Tried ports ${DEFAULT_PORT}-${MAX_PORT}. Set a different PORT and restart.`);
            }
        } else {
            console.error('Server startup error:', error);
        }
        process.exit(1);
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${port}`);
    });
};

const bootstrap = async () => {
    try {
        await connectDB();
        startServer(DEFAULT_PORT);
    } catch (error) {
        console.error('Failed to start application:', error.message);
        process.exit(1);
    }
};

bootstrap();
