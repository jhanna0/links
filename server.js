import express from 'express';
import routes from './routes.js';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import path from 'path';
import {
    postLimiter,
    postMinuteLimiter,
    getDailyLimiter,
    privateLimiter,
    verifyLimiter,
    keyRecoveryMinuteLimiter,
    keyRecoveryHourLimiter
} from './rate_limiting.js';

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
app.use("/modals", express.static(path.join(__dirname, "modals")));
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
app.use("/api/retrieve-key", keyRecoveryMinuteLimiter, keyRecoveryHourLimiter)

// ✅ Import Routes (Ensures Dynamic Routing Happens **After Static Files**)
app.use("/", routes);

// Start the server
app.listen(port, '0.0.0.0', () =>
    console.log(`🚀 Server running at http://0.0.0.0:${port}`)
);
