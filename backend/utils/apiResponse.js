const apiResponse = {
    success: (res, data, statusCode = 200) =>
        res.status(statusCode).json({
            success: true,
            data,
            timestamp: new Date().toISOString(),
        }),

    error: (res, message, statusCode = 500, details = null) => {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };

        if (details && process.env.NODE_ENV !== 'production') {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    },

    notFound: (res, resource = 'Resource') =>
        res.status(404).json({
            success: false,
            message: `${resource} not found`,
            timestamp: new Date().toISOString(),
        }),

    unauthorized: (res, message = 'Unauthorized') =>
        res.status(401).json({
            success: false,
            message,
            timestamp: new Date().toISOString(),
        }),
};

module.exports = apiResponse;
