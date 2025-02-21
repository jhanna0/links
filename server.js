import express from 'express';
import rateLimit from 'express-rate-limit';
import routes from './routes.js';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import path from 'path';

// Rate Limiters
const postLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 20, // Limit each IP to 20 requests per day
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "You may only add 20 links per day without an Access Key." });
    },
});

const postMinuteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per minute
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "You may only add 5 links per minute without an Access Key." });
    },
});

// 🔹 Global GET Rate Limit - 200 requests per 24 hours
const getDailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 200,
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).sendFile(path.join(__dirname, 'pages', '429.html'));
    },
});

const privateLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1,
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "You may only create one private page a day without an Access Key." });
    },
});

const verifyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "You may only attempt to enter passwords 20 times an hour without an Access Key." });
    },
});

const app = express();
const port = 3000; // Hardcoded port

// Set trust proxy for rate limiting
app.set('trust proxy', 1);

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve Static Files **First**
app.use(express.static(path.join(__dirname, "pages")));
app.use("/pages", express.static(path.join(__dirname, "pages")));
app.use("/common", express.static(path.join(__dirname, "common")));
app.use("/stripe", express.static(path.join(__dirname, "views/stripe")));

// ✅ Serve JavaScript & CSS files correctly before the dynamic `/:pagename` route
app.use("/scripts", express.static(path.join(__dirname, "scripts")));
app.use("/styles", express.static(path.join(__dirname, "styles")));

// ✅ Ensure `/stripe/response` is handled before the dynamic catch-all
app.get("/stripe/response", routes);

// Middleware - Request Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Rate Limiters (these stay the same)
app.get("/:pagename", getDailyLimiter);
app.get("/verify", verifyLimiter);
app.use("/add", postMinuteLimiter, postLimiter);
app.use("/create-private-page", privateLimiter);

// ✅ Import Routes (Ensures Dynamic Routing Happens **After Static Files**)
app.use("/", routes);

// Start the server
app.listen(port, '0.0.0.0', () =>
    console.log(`🚀 Server running at http://0.0.0.0:${port}`)
);
