const mongoose = require('mongoose');

const siteVisitLogSchema = new mongoose.Schema(
    {
        hashedIp: {
            type: String,
            required: true,
            index: true,
        },
        path: {
            type: String,
            required: true,
            index: true,
        },
        country: {
            type: String,
            default: 'Unknown',
            index: true,
        },
        deviceType: {
            type: String,
            enum: ['Desktop', 'Mobile', 'Tablet', 'Unknown'],
            default: 'Unknown',
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            index: true,
        },
        hour: {
            type: Number,
            required: true,
            min: 0,
            max: 23,
            index: true,
        },
        isNewVisitor: {
            type: Boolean,
            required: true,
            index: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        visitedAt: {
            type: Date,
            default: Date.now,
            index: true,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('SiteVisitLog', siteVisitLogSchema);
