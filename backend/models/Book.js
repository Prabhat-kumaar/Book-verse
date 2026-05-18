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
    },
    {
        timestamps: true,
    }
);

bookSchema.index({ createdAt: -1 });
bookSchema.index({ category: 1 });
bookSchema.index({ title: 'text', author: 'text' });

module.exports = mongoose.model('Book', bookSchema, 'books');
