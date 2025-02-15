// app.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import routes from './routes.js';

const app = express();
const port = 3000; // Hardcoded port

// Set trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiters
const minuteLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per minute
    message: JSON.stringify({ error: "You may only add 5 links a minute." }),
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
});

const dailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 20, // Limit each IP to 20 requests per day
    message: JSON.stringify({ error: "You may only add 20 links a day." }),
    statusCode: 429,
    headers: true,
    keyGenerator: (req) => req.ip,
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('pages'));
app.use('/common', express.static('common'));

app.use('/add', minuteLimiter, dailyLimiter);

// Import routes
app.use('/', routes);

// Start the server
app.listen(port, '0.0.0.0', () =>
    console.log(`🚀 Server running at http://0.0.0.0:${port}`)
);
