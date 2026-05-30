const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Book',
            required: true,
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        reviewText: {
            type: String,
            maxlength: 500,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// One review per user per book
reviewSchema.index({ user: 1, book: 1 }, { unique: true });

// Static method to calculate average rating and total reviews
reviewSchema.statics.calculateAverageRating = async function (bookId) {
    try {
        const stats = await this.aggregate([
            {
                $match: { book: bookId },
            },
            {
                $group: {
                    _id: '$book',
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                },
            },
        ]);

        if (stats.length > 0) {
            await mongoose.model('Book').findByIdAndUpdate(bookId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalReviews: stats[0].totalReviews,
            });
        } else {
            await mongoose.model('Book').findByIdAndUpdate(bookId, {
                averageRating: 0,
                totalReviews: 0,
            });
        }
    } catch (error) {
        console.error('Error calculating average rating:', error.message);
    }
};

// Call calculateAverageRating on save
reviewSchema.post('save', async function () {
    await this.constructor.calculateAverageRating(this.book);
});

// Call calculateAverageRating on remove
reviewSchema.post('remove', async function () {
    await this.constructor.calculateAverageRating(this.book);
});

module.exports = mongoose.model('Review', reviewSchema);
