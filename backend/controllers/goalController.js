const ReadingGoal = require('../models/ReadingGoal');
const Progress = require('../models/Progress');
const ReadingAnalyticsDay = require('../models/ReadingAnalyticsDay');
const mongoose = require('mongoose');

// Create or update a goal for a specific year
const createOrUpdateGoal = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const currentYear = new Date().getFullYear();
        const { year = currentYear, targetBooks, targetPages = 0 } = req.body;

        if (!targetBooks || isNaN(targetBooks) || targetBooks < 1) {
            return res.status(400).json({ message: 'Target books must be a number greater than or equal to 1' });
        }

        const goal = await ReadingGoal.findOneAndUpdate(
            { user: userId, year: Number(year) },
            { targetBooks: Number(targetBooks), targetPages: Number(targetPages) },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Reading goal saved successfully',
            data: goal,
        });
    } catch (error) {
        next(error);
    }
};

// Get current year goal and detailed progress calculations
const getMyGoal = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const currentYear = new Date().getFullYear();
        
        // Find goal for current year
        const goal = await ReadingGoal.findOne({ user: userId, year: currentYear });
        if (!goal) {
            return res.status(200).json({ success: true, goalSet: false });
        }

        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

        // Fetch completed books in the current year
        const completedBooks = await Progress.find({
            userId: userId.toString(),
            $or: [{ completed: true }, { progressPercentage: 100 }],
            updatedAt: { $gte: startOfYear, $lte: endOfYear }
        });

        const completedBooksCount = completedBooks.length;

        // Group completed books by month (for bar chart)
        const monthlyCompletions = Array(12).fill(0);
        completedBooks.forEach((book) => {
            const month = new Date(book.updatedAt).getMonth(); // 0-11
            monthlyCompletions[month] += 1;
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyBreakdown = monthNames.map((name, index) => ({
            name,
            completed: monthlyCompletions[index],
        }));

        // Aggregate pages read in the current year
        const pagesReadResult = await ReadingAnalyticsDay.aggregate([
            {
                $match: {
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startOfYear, $lte: endOfYear }
                }
            },
            {
                $group: {
                    _id: null,
                    totalPages: { $sum: '$pagesRead' }
                }
            }
        ]);
        const totalPagesRead = pagesReadResult.length > 0 ? pagesReadResult[0].totalPages : 0;

        // Calculate schedule and pace
        const today = new Date();
        const daysPassed = Math.max(1, Math.ceil((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
        const diffTime = endOfYear.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        const pace = completedBooksCount / daysPassed; // books per day
        const projectedFinish = pace * 365; // projected books at this rate

        let status = 'On track';
        if (completedBooksCount >= goal.targetBooks) {
            status = 'Goal achieved!';
        } else if (projectedFinish >= goal.targetBooks + 0.5) {
            status = 'Ahead of schedule';
        } else if (projectedFinish < goal.targetBooks - 0.5) {
            status = 'Behind schedule';
        }

        const monthsRemaining = Math.max(1, 12 - today.getMonth());
        const booksNeeded = Math.max(0, goal.targetBooks - completedBooksCount);
        const booksPerMonthNeeded = Number((booksNeeded / monthsRemaining).toFixed(1));

        res.status(200).json({
            success: true,
            goalSet: true,
            data: {
                goal,
                completedBooksCount,
                totalPagesRead,
                daysRemaining,
                projectedFinish: Math.round(projectedFinish),
                booksPerMonthNeeded,
                status,
                monthlyBreakdown,
            }
        });
    } catch (error) {
        next(error);
    }
};

// Get goals and results for all years
const getMyHistory = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const goals = await ReadingGoal.find({ user: userId }).sort({ year: -1 });

        if (!goals.length) {
            return res.status(200).json({ success: true, data: [] });
        }

        // ✅ FIX #5: Single aggregation instead of N+1 queries
        // Pehle saare years ke liye ek hi DB call — loop ke andar query nahi
        const years = goals.map(g => g.year);
        const startOfMinYear = new Date(Math.min(...years), 0, 1);
        const endOfMaxYear = new Date(Math.max(...years), 11, 31, 23, 59, 59, 999);

        const progressAgg = await Progress.aggregate([
            {
                $match: {
                    userId: userId.toString(),
                    $or: [{ completed: true }, { progressPercentage: 100 }],
                    updatedAt: { $gte: startOfMinYear, $lte: endOfMaxYear }
                }
            },
            {
                $group: {
                    _id: { $year: '$updatedAt' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // year → count map banao O(1) lookup ke liye
        const countsByYear = new Map(progressAgg.map(item => [item._id, item.count]));

        const history = goals.map(goal => ({
            year: goal.year,
            targetBooks: goal.targetBooks,
            completedBooksCount: countsByYear.get(goal.year) || 0,
        }));

        res.status(200).json({
            success: true,
            data: history,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrUpdateGoal,
    getMyGoal,
    getMyHistory,
};