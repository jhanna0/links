import rateLimit from 'express-rate-limit';
import pool from './db.js';

export const verifyApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.cookies.apiKey; // Check both

    if (!apiKey) {
        req.userAccess = false;
        return next(); // Proceed as a limited user
    }

    try {
        const result = await pool.query(
            "SELECT expires_at FROM api_keys WHERE key = $1 LIMIT 1",
            [apiKey]
        );

        if (result.rows.length === 0) {
            res.clearCookie("apiKey"); // Clear the cookie if the key is invalid
            req.userAccess = false;
            return next();
        }

        const { expires_at } = result.rows[0];
        if (new Date(expires_at) < new Date()) {
            res.clearCookie("apiKey"); // Remove expired API key
            req.userAccess = false;
            return next();
        }

        req.userAccess = true; // Allow increased rate limits
        next();
    } catch (error) {
        console.error("API Key Verification Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// Function to create a rate limiter
const createDynamicRateLimiter = (req, normalLimit, increasedLimit, errorMessage) => {
    return rateLimit({
        windowMs: 24 * 60 * 60 * 1000, // 1 day
        max: req.userAccess ? increasedLimit : normalLimit,
        statusCode: 429,
        headers: true,
        keyGenerator: (req) => req.ip,
        handler: (req, res) => res.status(429).json({ error: errorMessage }),
    });
};

// Define rate limiters using the function
export const postLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 20, 200, "You may only add 20 links per day without an Access Key.");
export const postMinuteLimiter = createDynamicRateLimiter(60 * 1000, 3, 20, "You may only add 5 links per minute without an Access Key.");
export const getDailyLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 200, 1000, true); // Sends a file response
export const privateLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 1, 5, "You may only create one private page a day without an Access Key.");
export const verifyLimiter = createDynamicRateLimiter(60 * 60 * 1000, 20, 30, "You may only attempt to enter passwords 20 times an hour without an Access Key.");
export const keyRecoveryMinuteLimiter = createDynamicRateLimiter(10 * 60 * 1000, 5, 5, "Exceeded key recovery limit. Try again in 10 minutes.");
export const keyRecoveryHourLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 15, 15, "Exceeded key recovery limit. Try again in 24 hours.");
