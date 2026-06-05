const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const validate = require('../utils/validate');
const AppError = require('../utils/appError');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

const serializeAuthResponse = (user) => ({
    token: generateToken(user._id, user.role),
    user: {
        _id: user._id,
        username: user.username,
        email: user.email || '',
        role: user.role,
        createdAt: user.createdAt,
    },
    role: user.role,
});

const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        const requiredCheck = validate.required(req.body, ['username', 'email', 'password']);
        if (!requiredCheck.valid) {
            return next(new AppError(requiredCheck.message, 400));
        }

        const cleanUsername = validate.sanitize(username, 100);
        const normalizedEmail = validate.sanitize(email, 254).toLowerCase();

        if (!validate.email(normalizedEmail)) {
            return next(new AppError('Invalid email format', 400));
        }

        if (!validate.password(password)) {
            return next(new AppError('Password must be at least 8 characters', 400));
        }

        const userExists = await User.findOne({
            $or: [
                { username: cleanUsername },
                { email: normalizedEmail },
            ],
        });

        if (userExists) {
            return next(new AppError('User already exists with the same username or email', 400));
        }

        const user = await User.create({
            username: cleanUsername,
            email: normalizedEmail,
            password,
            role: req.allowAdminCreation ? 'admin' : 'user',
        });

        res.status(201).json(serializeAuthResponse(user));
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { identifier, username, email, password } = req.body;

        const rawIdentifier = (identifier || username || email || '').trim();
        const loginId = rawIdentifier.toLowerCase();

        if (!rawIdentifier || !password) {
            return res.status(400).json({ message: 'Identifier and password are required' });
        }

        const user = await User.findOne({
            $or: [
                { username: rawIdentifier },
                { username: loginId },
                { email: loginId },
            ],
        });

        if (user && (await user.matchPassword(password))) {
            res.json(serializeAuthResponse(user));
        } else {
            // Legacy support: migrate old Admin collection users into User(role=admin) on successful login.
            const legacyAdmin = await Admin.findOne({ email: loginId });
            if (!legacyAdmin || !(await legacyAdmin.matchPassword(password))) {
                return next(new AppError('Invalid credentials', 401));
            }

            const existingUserByEmail = await User.findOne({ email: legacyAdmin.email });
            if (existingUserByEmail) {
                existingUserByEmail.password = password;
                existingUserByEmail.role = 'admin';
                if (!existingUserByEmail.username) {
                    existingUserByEmail.username = legacyAdmin.email;
                }
                await existingUserByEmail.save();
                return res.json(serializeAuthResponse(existingUserByEmail));
            }

            const migratedAdmin = await User.create({
                username: legacyAdmin.email,
                email: legacyAdmin.email,
                password,
                role: 'admin',
            });

            return res.json(serializeAuthResponse(migratedAdmin));
        }
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email || '',
            role: user.role,
            avatar: user.avatar || '',
            readingGoal: user.readingGoal || 12,
            streak: user.streak,
            analytics: user.analytics,
            createdAt: user.createdAt,
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { username, email, readingGoal, avatar } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username !== undefined) {
            const cleanUsername = validate.sanitize(username, 100);
            if (cleanUsername) {
                if (cleanUsername !== user.username) {
                    const exists = await User.findOne({ username: cleanUsername });
                    if (exists) {
                        return res.status(400).json({ message: 'Username is already taken' });
                    }
                }
                user.username = cleanUsername;
            }
        }

        if (email !== undefined) {
            const normalizedEmail = validate.sanitize(email, 254).toLowerCase();
            if (normalizedEmail) {
                if (!validate.email(normalizedEmail)) {
                    return res.status(400).json({ message: 'Invalid email format' });
                }
                if (normalizedEmail !== user.email) {
                    const exists = await User.findOne({ email: normalizedEmail });
                    if (exists) {
                        return res.status(400).json({ message: 'Email is already taken' });
                    }
                }
                user.email = normalizedEmail;
            }
        }

        if (readingGoal !== undefined) {
            const goal = Number(readingGoal);
            if (!isNaN(goal) && goal >= 0) {
                user.readingGoal = goal;
            }
        }

        if (avatar !== undefined) {
            user.avatar = String(avatar || '').trim();
        }

        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email || '',
            role: user.role,
            avatar: user.avatar || '',
            readingGoal: user.readingGoal || 12,
            streak: user.streak,
            analytics: user.analytics,
            createdAt: user.createdAt,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
};
