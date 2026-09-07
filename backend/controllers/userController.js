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

const validate = require('../utils/validate');

const updateBannedState = async (req, res, next, isBanned) => {
    try {
        const targetId = req.params.id;
        if (!validate.objectId(targetId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        // Prevent admin from banning their own account
        if (req.user?._id?.toString() === targetId && isBanned) {
            return res.status(400).json({ success: false, message: 'You cannot ban your own admin account' });
        }

        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent banning other admin accounts
        if (targetUser.role === 'admin' && isBanned) {
            return res.status(400).json({ success: false, message: 'Administrator accounts cannot be banned' });
        }

        targetUser.isBanned = isBanned;
        await targetUser.save();

        return res.json({
            success: true,
            data: {
                _id: targetUser._id,
                username: targetUser.username,
                email: targetUser.email || '',
                role: targetUser.role,
                createdAt: targetUser.createdAt,
                isBanned: Boolean(targetUser.isBanned),
                avatar: targetUser.avatar || '',
            },
        });
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
