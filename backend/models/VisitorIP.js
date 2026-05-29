const mongoose = require('mongoose');

const visitorIpSchema = new mongoose.Schema(
    {
        ip: {
            type: String,
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index to make sure one IP only counts once per day
visitorIpSchema.index({ ip: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('VisitorIP', visitorIpSchema);
