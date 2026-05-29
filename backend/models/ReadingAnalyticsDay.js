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

// Pre-save validation hook
readingAnalyticsDaySchema.pre('save', function (next) {
    const doc = this;

    // Rule 1: If pagesRead > 100 AND readingSeconds === 0, reject the record
    if (doc.pagesRead > 100 && doc.readingSeconds === 0) {
        return next(new Error('Impossible data: Cannot read more than 100 pages in 0 seconds.'));
    }

    // Rule 2: If sessions > 0 AND readingSeconds === 0, reject the record
    if (doc.sessions > 0 && doc.readingSeconds === 0) {
        return next(new Error('Impossible data: Cannot log active sessions with 0 reading seconds.'));
    }

    // Rule 5: Minimum readingSeconds per page rule (at least 2 seconds per page)
    if (doc.pagesRead > 0) {
        const secondsPerPage = doc.readingSeconds / doc.pagesRead;
        if (secondsPerPage < 2) {
            return next(new Error('Impossible data: Human reading speed limit violated (minimum 2 seconds per page).'));
        }
    }

    next();
});

module.exports = mongoose.model('ReadingAnalyticsDay', readingAnalyticsDaySchema);
