const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
    if (!uri || !uri.trim()) {
        throw new Error('Missing required environment variable: MONGO_URI (or MONGODB_URI)');
    }

    const dbName = (process.env.MONGO_DB_NAME || '').trim() || undefined;
    const conn = await mongoose.connect(uri, dbName ? { dbName } : undefined);

    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log(`MongoDB database in use: ${conn.connection.name}`);
};

module.exports = connectDB;
