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

module.exports = mongoose.model('Book', bookSchema);
