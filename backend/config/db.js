const mongoose = require('mongoose');

const looksLikePlaceholder = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return true;

    return (
        /<[^>]+>/.test(raw) ||
        /^replace_with_/i.test(raw) ||
        /^your_/i.test(raw)
    );
};

const resolveMongoUris = () => {
    const primary = (process.env.MONGO_URI || '').trim();
    const fallback = (process.env.MONGODB_URI || '').trim();

    const validPrimary = !looksLikePlaceholder(primary) ? primary : '';
    const validFallback = !looksLikePlaceholder(fallback) ? fallback : '';

    return {
        primary: validPrimary,
        fallback: validFallback,
    };
};

const connectDB = async () => {
    const { primary, fallback } = resolveMongoUris();
    if (!primary && !fallback) {
        throw new Error('Missing valid MONGO_URI (or MONGODB_URI). Update backend/.env with a real MongoDB URI.');
    }

    const dbName = (process.env.MONGO_DB_NAME || '').trim() || undefined;
    const connectWithUri = async (uri) => mongoose.connect(uri, dbName ? { dbName } : undefined);
    let conn = null;

    try {
        conn = await connectWithUri(primary || fallback);
    } catch (error) {
        const shouldTryFallback =
            Boolean(fallback) &&
            fallback !== primary &&
            /querysrv|enotfound|econnrefused/i.test(error?.message || '');

        if (!shouldTryFallback) {
            throw error;
        }

        console.warn('Primary MongoDB URI failed; trying fallback MONGODB_URI...');
        conn = await connectWithUri(fallback);
    }

    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log(`MongoDB database in use: ${conn.connection.name}`);
};

module.exports = connectDB;
