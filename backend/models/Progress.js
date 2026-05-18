const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            trim: true,
        },
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
            required: true,
        },
        page: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        currentPage: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        totalPages: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        progressPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0,
        },
        locationCfi: {
            type: String,
            default: '',
            trim: true,
        },
        chapterTitle: {
            type: String,
            default: '',
            trim: true,
        },
        chapterIndex: {
            type: Number,
            min: 0,
            default: 0,
        },
        lastReadAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

progressSchema.index({ userId: 1, book: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
