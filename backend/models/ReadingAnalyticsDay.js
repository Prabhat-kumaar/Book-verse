const mongoose = require('mongoose');

const readingAnalyticsDaySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        pagesRead: {
            type: Number,
            default: 0,
            min: 0,
        },
        readingSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        sessions: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

readingAnalyticsDaySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ReadingAnalyticsDay', readingAnalyticsDaySchema);
