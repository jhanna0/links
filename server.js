import express from 'express';
import routes from './routes/routes.js';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import path from 'path';
import {
    verifyApiKey
} from './middleware/rate_limiting.js';

const app = express();
const port = 3000; // Hardcoded port

// Set trust proxy for rate limiting
app.set('trust proxy', 1);

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve only specific static files (CSS, JS, Images)
app.use(express.static(path.join(__dirname, "public")));
app.use("/common", express.static(path.join(__dirname, "common")));

// ✅ Custom Middleware to Block Invalid Paths
// app.use((req, res, next) => {
//     // ✅ If request has a `/` in the middle (e.g., `/public/styles`), return invalid page
//     if (req.path !== '/' && req.path.includes('/')) {
//         return res.status(404).sendFile(path.join(__dirname, "views", "invalid_page.html"));
//     }
//     next();
// });

// Middleware - Request Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(verifyApiKey);

// ✅ Import Routes (Ensures Dynamic Routing Happens **After Static Files**)
app.use("/", routes);

// Start the server
app.listen(port, '0.0.0.0', () =>
    console.log(`🚀 Server running at http://0.0.0.0:${port}`)
);
