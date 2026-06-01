const User = require('../models/User');
const Progress = require('../models/Progress');

const getAllUsersAdmin = async (_req, res, next) => {
    try {
        const [users, progressStats] = await Promise.all([
            User.find()
                .select('username email role createdAt isBanned avatar')
                .sort({ createdAt: -1 })
                .lean(),
            Progress.aggregate([
                {
                    $group: {
                        _id: '$userId',
                        booksStarted: { $sum: 1 },
                        booksCompleted: {
                            $sum: { $cond: ['$completed', 1, 0] }
                        }
                    }
                }
            ])
        ]);

        const statsByUserId = new Map(
            progressStats.map((item) => [String(item._id), item])
        );

        const data = users.map((user) => {
            const stats = statsByUserId.get(String(user._id)) || {};
            return {
                _id: user._id,
                username: user.username,
                email: user.email || '',
                role: user.role,
                createdAt: user.createdAt,
                isBanned: Boolean(user.isBanned),
                avatar: user.avatar || '',
                booksStarted: stats.booksStarted || 0,
                booksCompleted: stats.booksCompleted || 0,
            };
        });

        return res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

const updateBannedState = async (req, res, next, isBanned) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBanned },
            { new: true }
        ).select('username email role createdAt isBanned avatar');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

const banUser = (req, res, next) => updateBannedState(req, res, next, true);

const unbanUser = (req, res, next) => updateBannedState(req, res, next, false);

module.exports = {
    getAllUsersAdmin,
    banUser,
    unbanUser,
};
