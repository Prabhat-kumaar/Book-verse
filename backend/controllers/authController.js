const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
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
        const { username, email, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        const userExists = await User.findOne({
            $or: [
                { username: username.trim() },
                ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ],
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists with the same username or email' });
        }

        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail || undefined,
            password,
            role: role === 'admin' ? 'admin' : 'user',
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
                return res.status(401).json({ message: 'Invalid credentials' });
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
