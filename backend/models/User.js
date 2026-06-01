const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            sparse: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['admin', 'user'],
            default: 'user',
        },
        isBanned: {
            type: Boolean,
            default: false,
        },
        streak: {
            currentStreak: {
                type: Number,
                default: 0,
                min: 0,
            },
            longestStreak: {
                type: Number,
                default: 0,
                min: 0,
            },
            lastReadingDate: {
                type: Date,
                default: null,
            },
            totalReadingDays: {
                type: Number,
                default: 0,
                min: 0,
            },
            streakFreezeAvailable: {
                type: Boolean,
                default: true,
            },
            lastFreezeUsedAt: {
                type: Date,
                default: null,
            },
        },
        analytics: {
            totalPagesRead: {
                type: Number,
                default: 0,
                min: 0,
            },
            totalReadingSeconds: {
                type: Number,
                default: 0,
                min: 0,
            },
            totalSessions: {
                type: Number,
                default: 0,
                min: 0,
            },
            booksCompleted: {
                type: Number,
                default: 0,
                min: 0,
            },
            lastSessionAt: {
                type: Date,
                default: null,
            },
        },
        avatar: {
            type: String,
            default: '',
        },
        readingGoal: {
            type: Number,
            default: 12,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
