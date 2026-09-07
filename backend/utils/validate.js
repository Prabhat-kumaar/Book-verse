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
        if (typeof email !== 'string' || email.length > 254) return false;
        const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        return re.test(email.toLowerCase().trim());
    },

    password: (password) => typeof password === 'string' && password.length >= 8 && password.length <= 128,

    sanitize: (str, maxLength = 500) => {
        if (typeof str !== 'string') return '';
        // Strip null bytes and control characters (except standard whitespace)
        return str.replace(/\0/g, '').trim().slice(0, maxLength);
    },

    objectId: (id) => typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id.trim()),
};

module.exports = validate;
