import rateLimit from 'express-rate-limit';
import pool from '../db/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const verifyApiKey = async (req, res, next) => {
    const apiKey = req.cookies.apiKey; // Check both

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


// Function to create a dynamic rate limiter (✅ req is restored)
const createDynamicRateLimiter = (windowMs, normalLimit, increasedLimit, fileResponse = false, errorMessage = "Too many requests. Try again later.") => {
    return rateLimit({
        windowMs, // ✅ Keeps original windowMs
        max: (req) => (req.userAccess ? increasedLimit : normalLimit), // ✅ Uses req to determine limits
        statusCode: 429,
        headers: true,
        keyGenerator: (req) => req.ip,
        handler: (req, res) => {
            if (fileResponse) {
                // ✅ Then send the 429.html file
                return res.sendFile(path.join(__dirname, 'pages', '429.html'));
            } else {
                return res.status(429).json({ error: errorMessage });
            }
        },
    });
};

// ✅ Define rate limiters using the function (Now correctly passing req-based limits)
export const postLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 20, 200, false, "You may only add 20 links per day without an Access Key.");
export const postMinuteLimiter = createDynamicRateLimiter(60 * 1000, 3, 20, false, "You may only add 5 links per minute without an Access Key.");
export const getDailyLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 200, 1000, true, "Daily request limit exceeded."); // ✅ Sends file response + JSON
export const privateLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 1, 5, false, "You may only create one private page a day without an Access Key.");
export const verifyLimiter = createDynamicRateLimiter(60 * 60 * 1000, 20, 30, false, "You may only attempt to enter passwords 20 times an hour without an Access Key.");
export const keyRecoveryMinuteLimiter = createDynamicRateLimiter(10 * 60 * 1000, 5, 5, false, "Exceeded key recovery limit. Try again in 10 minutes.");
export const keyRecoveryHourLimiter = createDynamicRateLimiter(24 * 60 * 60 * 1000, 15, 15, false, "Exceeded key recovery limit. Try again in 24 hours.");