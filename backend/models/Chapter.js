const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema(
    {
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
            required: true,
            index: true,
        },
        bookSlug: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },
        chapterNumber: {
            type: Number,
            required: true,
            min: 1,
            index: true,
        },
        chapterTitle: {
            type: String,
            required: true,
            trim: true,
        },
        paragraphs: {
            type: [String],
            default: [],
        },
        quotes: {
            type: [String],
            default: [],
        },
        pullQuote: {
            type: String,
            default: '',
            trim: true,
        },
        wordCount: {
            type: Number,
            default: 0,
        },
        readingTimeMinutes: {
            type: Number,
            default: 1,
        },
        sourceHref: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

chapterSchema.index({ book: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ bookSlug: 1, chapterNumber: 1 });

module.exports = mongoose.model('Chapter', chapterSchema, 'chapters');
