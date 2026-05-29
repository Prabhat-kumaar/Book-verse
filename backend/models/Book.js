const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        author: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        tags: {
            type: [String],
            default: [],
            set: (tags) => Array.isArray(tags)
                ? tags.map((tag) => String(tag).trim()).filter(Boolean)
                : [],
        },
        language: {
            type: String,
            default: '',
            trim: true,
        },
        difficulty: {
            type: String,
            enum: ['', 'Beginner', 'Intermediate', 'Advanced'],
            default: '',
            trim: true,
        },
        fileUrl: {
            type: String,
            required: true,
            trim: true,
        },
        fileType: {
            type: String,
            required: true,
            enum: ['pdf', 'epub'],
            lowercase: true,
            trim: true,
        },
        pdf: {
            type: String,
            trim: true,
        },
        thumbnail: {
            type: String,
            required: true,
            trim: true,
        },
        openCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

bookSchema.index({ createdAt: -1 });
bookSchema.index({ category: 1 });
bookSchema.index({ title: 'text', author: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Book', bookSchema, 'books');
