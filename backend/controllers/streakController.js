const User = require('../models/User');
const Progress = require('../models/Progress');

const atDayStart = (dateLike) => {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getWeekStart = (dateLike) => {
    const d = atDayStart(dateLike);
    const day = d.getDay();
    const offset = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - offset);
    return d;
};

const getUserStreak = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString?.() || '';
        if (!userId) return res.status(401).json({ message: 'Not authorized' });

        const user = await User.findById(userId).select('streak');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const streak = user.streak || {
            currentStreak: 0,
            longestStreak: 0,
            lastReadingDate: null,
            totalReadingDays: 0,
            streakFreezeAvailable: true,
            lastFreezeUsedAt: null,
        };

        const weekStart = getWeekStart(new Date());
        const progress = await Progress.find({
            userId,
            lastReadAt: { $gte: weekStart },
        }).select('lastReadAt');
        const uniqueDays = new Set(progress.map((p) => atDayStart(p.lastReadAt).toISOString().slice(0, 10)));
        const weeklyReadingDays = uniqueDays.size;

        const totalBooksRead = await Progress.countDocuments({
            userId,
            progressPercentage: { $gte: 95 },
        });

        const badges = [
            {
                key: 'streak7',
                label: '🔥 7 Day Streak',
                earned: (streak.currentStreak || 0) >= 7,
            },
            {
                key: 'books10',
                label: '📚 10 Books Read',
                earned: totalBooksRead >= 10,
            },
            {
                key: 'nightReader',
                label: '⚡ Night Reader',
                earned: progress.some((p) => {
                    const hour = new Date(p.lastReadAt).getHours();
                    return hour >= 21 || hour <= 4;
                }),
            },
        ];

        res.json({
            ...streak,
            weeklyReadingDays,
            weeklyGoalTarget: 5,
            badges,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUserStreak,
};
