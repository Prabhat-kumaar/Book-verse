const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
            unique: true, // One entry per calendar day at midnight start
            index: true,
        },
        count: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
