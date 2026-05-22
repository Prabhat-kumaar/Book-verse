const apiResponse = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (err.isOperational) {
        return apiResponse.error(res, err.message, err.statusCode, err.stack);
    }

    // Log unexpected errors for the developer
    console.error("ERROR ??", err);

    return apiResponse.error(res, "Something went very wrong!", 500, err.message);
};

module.exports = errorMiddleware;
