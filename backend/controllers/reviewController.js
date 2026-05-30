const Review = require('../models/Review');
const Book = require('../models/Book');
const AppError = require('../utils/appError');
const validate = require('../utils/validate');

// Add or update a review
const addOrUpdateReview = async (req, res, next) => {
    try {
        const { bookId } = req.params;
        const { rating, reviewText = '' } = req.body;
        const userId = req.user._id;

        // Validate book existence
        const bookExists = await Book.findById(bookId);
        if (!bookExists) {
            return next(new AppError('Book not found', 404));
        }

        // Validate rating values
        const parsedRating = Number(rating);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5 || !Number.isInteger(parsedRating)) {
            return next(new AppError('Rating must be an integer between 1 and 5', 400));
        }

        // Validate and sanitize reviewText
        const sanitizedText = String(reviewText || '').trim().slice(0, 500);

        // Find or create review
        let review = await Review.findOne({ user: userId, book: bookId });

        if (review) {
            review.rating = parsedRating;
            review.reviewText = sanitizedText;
            await review.save();
        } else {
            review = await Review.create({
                user: userId,
                book: bookId,
                rating: parsedRating,
                reviewText: sanitizedText,
            });
        }

        // Force dynamic recalculation to be safe
        await Review.calculateAverageRating(bookId);

        res.status(200).json({
            success: true,
            message: 'Review saved successfully',
            data: review,
        });
    } catch (error) {
        next(error);
    }
};

// Get all reviews for a book
const getBookReviews = async (req, res, next) => {
    try {
        const { bookId } = req.params;
        const { sortBy = 'recent' } = req.query; // 'recent' or 'rating'

        // Determine sort order
        let sortOption = { createdAt: -1 };
        if (sortBy === 'rating') {
            sortOption = { rating: -1, createdAt: -1 };
        }

        const reviews = await Review.find({ book: bookId })
            .populate('user', 'username avatar')
            .sort(sortOption);

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews,
        });
    } catch (error) {
        next(error);
    }
};

// Delete a user's own review
const deleteReview = async (req, res, next) => {
    try {
        const { bookId } = req.params;
        const userId = req.user._id;

        const review = await Review.findOne({ user: userId, book: bookId });
        if (!review) {
            return next(new AppError('Review not found or not authorized to delete', 404));
        }

        await Review.deleteOne({ _id: review._id });

        // Force dynamic recalculation to be safe
        await Review.calculateAverageRating(bookId);

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Get all reviews by the logged-in user
const getMyReviews = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const reviews = await Review.find({ user: userId })
            .populate('book', 'title author thumbnail')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addOrUpdateReview,
    getBookReviews,
    deleteReview,
    getMyReviews,
};
