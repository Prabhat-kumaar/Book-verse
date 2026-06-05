const validate = {
    required: (obj, fields) => {
        const missing = fields.filter(
            (field) =>
                obj[field] === undefined ||
                obj[field] === null ||
                (typeof obj[field] === 'string' && obj[field].trim() === '')
        );

        if (missing.length > 0) {
            return {
                valid: false,
                message: `Missing required fields: ${missing.join(', ')}`,
            };
        }

        return { valid: true };
    },

    email: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    },

    password: (password) => typeof password === 'string' && password.length >= 8,

    sanitize: (str, maxLength = 500) => {
        if (typeof str !== 'string') return '';
        return str.trim().slice(0, maxLength);
    },

    objectId: (id) => /^[a-fA-F0-9]{24}$/.test(id),
};

module.exports = validate;
