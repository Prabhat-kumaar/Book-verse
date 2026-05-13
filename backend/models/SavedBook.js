const mongoose = require('mongoose');

const savedBookSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
            required: true,
            index: true,
        },
        collection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SavedCollection',
            required: true,
            index: true,
        },
        savedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        suppressReservedKeysWarning: true,
    }
);

savedBookSchema.index({ user: 1, book: 1, collection: 1 }, { unique: true });

module.exports = mongoose.model('SavedBook', savedBookSchema);
