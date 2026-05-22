const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const validate = require('../utils/validate');
const AppError = require('../utils/appError');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const serializeAuthResponse = (user) => ({
    token: generateToken(user._id, user.role),
    user: {
        _id: user._id,
        username: user.username,
        email: user.email || '',
        role: user.role,
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
            return next(new AppError('Password must be at least 6 characters', 400));
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

module.exports = {
    register,
    login,
};
