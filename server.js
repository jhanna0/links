import express from 'express';
import rateLimit from 'express-rate-limit';
import routes from './routes.js';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import path from 'path';

const app = express();
const port = 3000; // Hardcoded port

// Set trust proxy for rate limiting
app.set('trust proxy', 1);

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 🔹 Global GET Rate Limit - 5 requests per 24 hours
const getDailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 200, // Limit each IP to 200 GET requests per day
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).sendFile(path.join(__dirname, 'pages', '429.html'));
    },
});

const privateLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1, // Limit each IP to 1 private page per day
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "You may only create one private page a day without an Access Key." });
    },
});

const verifyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 5 requests per minute
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
    handler: (req, res) => {
        res.status(429).json({ error: "You may only attempt to enter passwords 20 times an hour without an Access Key." });
    },
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('pages'));
app.use('/common', express.static('common'));

// 🔹 Apply GET limit to all GET requests
app.get('/:pagename', getDailyLimiter);

// 🔹 Apply GET limit to all GET requests
app.get('/verify', verifyLimiter);

// 🔹 Apply POST limits only to /add
app.use('/add', postMinuteLimiter, postLimiter);

// 🔹 Apply POST limits only to /add
app.use('/create-private-page', privateLimiter);

// Import routes
app.use('/', routes);

// Start the server
app.listen(port, '0.0.0.0', () =>
    console.log(`🚀 Server running at http://0.0.0.0:${port}`)
);
