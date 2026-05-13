const mongoose = require('mongoose');

const savedCollectionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

savedCollectionSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SavedCollection', savedCollectionSchema);
