const mongoose = require('mongoose');

const highlightSchema = new mongoose.Schema(
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
            index: true,
        },
        cfiRange: {
            type: String,
            required: true,
            trim: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        color: {
            type: String,
            enum: ['purple', 'yellow', 'green', 'pink'],
            default: 'purple',
            trim: true,
        },
        note: {
            type: String,
            default: '',
            trim: true,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to quickly query all highlights for a user on a specific book
highlightSchema.index({ userId: 1, book: 1 });

module.exports = mongoose.model('Highlight', highlightSchema);
