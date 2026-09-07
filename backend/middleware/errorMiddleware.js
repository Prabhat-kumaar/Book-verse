const apiResponse = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    // Multer upload errors or file filter errors
    if (err.name === 'MulterError' || err.message?.includes('permitted') || err.message?.includes('allowed')) {
        return apiResponse.error(res, err.message, 400);
    }

    if (err.isOperational) {
        return apiResponse.error(res, err.message, err.statusCode, err.stack);
    }

    console.error('Unhandled API error:', err);

    return apiResponse.error(res, err.message || "Failed to process request", err.statusCode || 500, err.message);
};

module.exports = errorMiddleware;
