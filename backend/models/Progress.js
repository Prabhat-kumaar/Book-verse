const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
            required: true,
        },
        currentPage: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
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
        fileType: {
            type: String,
            enum: ['pdf', 'epub'],
            default: 'pdf',
            lowercase: true,
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
        readingTime: {
            type: Number,
            min: 0,
            default: 0,
        },
        completed: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Backward compatibility virtual aliases for convenience
progressSchema.virtual('page').get(function () {
    return this.currentPage;
}).set(function (val) {
    this.currentPage = val;
});

progressSchema.virtual('percentage').get(function () {
    return this.progressPercentage;
}).set(function (val) {
    this.progressPercentage = val;
});

progressSchema.virtual('epubCfi').get(function () {
    return this.locationCfi;
}).set(function (val) {
    this.locationCfi = val;
});

// Strict unique index: one progress record per user per book
progressSchema.index({ userId: 1, book: 1 }, { unique: true });
progressSchema.index({ userId: 1, lastReadAt: -1 });

module.exports = mongoose.model('Progress', progressSchema);
