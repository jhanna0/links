import rateLimit from 'express-rate-limit';

// Function to create a rate limiter
const createRateLimiter = (windowMs, max, errorMessage, fileResponse = false) => {
    return rateLimit({
        windowMs,
        max,
        statusCode: 429,
        headers: true,
        keyGenerator: (req) => req.ip,
        handler: (req, res) => {
            if (fileResponse) {
                res.status(429).sendFile(path.join(__dirname, 'pages', '429.html'));
            } else {
                res.status(429).json({ error: errorMessage });
            }
        },
    });
};

// Define rate limiters using the function
export const postLimiter = createRateLimiter(24 * 60 * 60 * 1000, 20, "You may only add 20 links per day without an Access Key.");
export const postMinuteLimiter = createRateLimiter(60 * 1000, 5, "You may only add 5 links per minute without an Access Key.");
export const getDailyLimiter = createRateLimiter(24 * 60 * 60 * 1000, 200, "", true); // Sends a file response
export const privateLimiter = createRateLimiter(24 * 60 * 60 * 1000, 1, "You may only create one private page a day without an Access Key.");
export const verifyLimiter = createRateLimiter(60 * 60 * 1000, 20, "You may only attempt to enter passwords 20 times an hour without an Access Key.");
export const keyRecoveryMinuteLimiter = createRateLimiter(10 * 60 * 1000, 5, "Exceeded key recovery limit. Try again in 10 minutes.");
export const keyRecoveryHourLimiter = createRateLimiter(24 * 60 * 60 * 1000, 15, "Exceeded key recovery limit. Try again in 24 hours.");
