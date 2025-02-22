// routes.js (ES Module version)
import express from 'express';
import { createCheckoutSession, handleStripeResponse } from "../stripe/stripe_handler.js"; // Import Stripe functions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/db.js';
import { validatePageName, validateLink, validateDescription } from "../common/validator.js";
import { generateSecureString, generateStyledEntries, generateSalt, hashPassword, generateAuthToken, validateAuthToken, hashEmail } from "../common/utils.js";

import {
    postLimiter,
    postMinuteLimiter,
    getDailyLimiter,
    privateLimiter,
    verifyLimiter,
    keyRecoveryMinuteLimiter,
    keyRecoveryHourLimiter
} from '../middleware/rate_limiting.js';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve the homepage (GET /)
// router.get('/', (_, res) => {
//     res.sendFile(path.join(__dirname, 'pages', 'index.html'));
// });

// Handle form submissions (POST /add)
router.post('/add', postMinuteLimiter, postLimiter, async (req, res) => {
    let { page, link, description = '' } = req.body;

    // Validate page name
    const pageValidation = validatePageName(page);
    if (!pageValidation.valid) {
        return res.status(400).json({ error: pageValidation.error });
    }

    // Ensure link starts with "https://"
    if (!/^https?:\/\//i.test(link)) {
        link = 'https://' + link;
    }

    // Validate the link
    const linkValidation = validateLink(link);
    if (!linkValidation.valid) {
        return res.status(400).json({ error: linkValidation.error });
    }

    const descriptionValidation = validateDescription(description);
    if (!descriptionValidation.valid) {
        return res.status(400).json({ error: descriptionValidation.error });
    }

    try {
        // 🆕 Check if the page is private
        const privatePageResult = await pool.query(
            'SELECT posting_password, viewing_password, salt FROM private_pages WHERE page = $1',
            [page]
        );

        if (privatePageResult.rows.length > 0) {
            // The page is private, require authentication
            const authCookieName = `auth_${page}`;
            const authToken = req.cookies[authCookieName];

            if (!authToken) {
                return res.status(403).json({ error: '🔒 Authentication required to post to this private page.' });
            }

            // Validate the token
            const tokenPayload = validateAuthToken(authToken);
            if (!tokenPayload || tokenPayload.page !== page) {
                return res.status(403).json({ error: '❌ Invalid authentication token.' });
            }

            // 🔒 Extract stored passwords
            const { posting_password } = privatePageResult.rows[0];

            // Ensure the token grants **posting** access, not just viewing access
            if (tokenPayload.hashedPassword !== posting_password) {
                return res.status(403).json({ error: '⛔ You do not have permission to post to this page.' });
            }
        }

        // ✅ Insert the link if valid
        const insertQuery = `
            INSERT INTO links (page, link, description)
            VALUES ($1, $2, $3) 
            ON CONFLICT (page, link, description) DO NOTHING
        `;

        const result = await pool.query(insertQuery, [page, link, description]);

        if (result.rowCount === 0) {
            return res.status(200).json({ success: true, message: "Entry already exists." });
        }

        res.status(201).json({ success: true, message: "Link added successfully" });

    } catch (err) {
        console.error('Database error on insert:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/create-private-page', privateLimiter, async (req, res) => {
    try {
        let pageName;
        let attempts = 0;
        // Try up to 5 times to generate a unique page name
        do {
            pageName = "~" + generateSecureString(8);
            const checkResult = await pool.query('SELECT 1 FROM private_pages WHERE page = $1', [pageName]);
            if (checkResult.rowCount === 0) break;
            attempts++;
        } while (attempts < 5);

        if (attempts >= 5) {
            return res.status(500).json({ error: 'Could not generate a unique page name, please try again.' });
        }

        const postingPassword = "P-" + generateSecureString(8);
        const viewingPassword = "V-" + generateSecureString(8);

        const salt = generateSalt();
        const hashedPostingPassword = hashPassword(postingPassword, salt);
        const hashedViewingPassword = hashPassword(viewingPassword, salt);

        await pool.query(
            `INSERT INTO private_pages (page, posting_password, viewing_password, salt)
         VALUES ($1, $2, $3, $4)`,
            [pageName, hashedPostingPassword, hashedViewingPassword, salt]
        );

        res.json({
            success: true,
            pageName,
            postingPassword,
            viewingPassword
        });
    } catch (err) {
        console.error('❌ Error creating private page:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// POST /login for authenticating private pages
router.post('/verify-password', verifyLimiter, async (req, res) => {
    const { pagename, password } = req.body;

    // Query your DB for the page
    const privatePageResult = await pool.query(
        'SELECT posting_password, viewing_password, salt FROM private_pages WHERE page = $1',
        [pagename]
    );

    if (privatePageResult.rows.length === 0) {
        return res.status(404).json({ error: 'Page not found' });
    }

    const { posting_password, viewing_password, salt } = privatePageResult.rows[0];
    const hashedPassword = hashPassword(password, salt);

    if (hashedPassword !== posting_password && hashedPassword !== viewing_password) {
        return res.status(401).json({ error: 'Invalid password.' });
    }

    // Create an auth token.
    const authToken = generateAuthToken(pagename, hashedPassword);

    // Set cookie. Consider setting HttpOnly and Secure flags in production.
    res.cookie(`auth_${pagename}`, authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    });

    // Return a JSON response instead of redirecting
    res.status(200).json({ success: true, redirect: `/${pagename}` });
});


// Stripe Checkout Route
router.post("/create-checkout-session", createCheckoutSession);

/** 
 * ✅ Route 1: Serve the API Key Recovery Page (HTML)
 */
// move to static
router.get("/retrieve/access/key", (req, res) => {
    res.sendFile(path.join(__dirname, "../views", "pages", "recover_key.html"));
});

router.get("/api/retrieve-key", keyRecoveryMinuteLimiter, keyRecoveryHourLimiter, async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email required." });

    try {
        // Hash the email before looking it up (assuming emails are stored hashed)
        const hashedEmail = hashEmail(email);

        // ✅ Retrieve the latest API key (expired or not)
        const result = await pool.query(
            "SELECT key, expires_at FROM api_keys WHERE hashed_email = $1 ORDER BY created_at DESC LIMIT 1",
            [hashedEmail]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, message: "No API key found.", apiKey: null, expired: false });
        }

        const { key, expires_at } = result.rows[0];
        const now = new Date();

        // ✅ Return key with expiration status
        const expired = new Date(expires_at) < now;

        res.json({
            success: true,
            apiKey: key,
            expiresAt: expires_at,
            expired,
            message: expired ? "API Key is expired." : "API Key is valid."
        });

    } catch (error) {
        console.error("Error retrieving API Key:", error);
        res.status(500).json({ success: false, error: "Error retrieving API Key." });
    }
});

// Verify API Key
router.post("/api/verify-key", keyRecoveryMinuteLimiter, keyRecoveryHourLimiter, async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).json({ error: "API Key required." });
    }

    try {
        // 🔎 Check if the API key exists
        const result = await pool.query(
            "SELECT expires_at FROM api_keys WHERE key = $1 LIMIT 1",
            [apiKey]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Invalid API Key." });
        }

        const { expires_at } = result.rows[0];

        // ⏳ Check if the API key has expired
        if (new Date(expires_at) < new Date()) {
            return res.status(410).json({ error: "API Key expired.", expiredAt: expires_at });
        }

        // ✅ API key is valid
        res.json({ success: true, message: "API Key is valid." });

    } catch (error) {
        console.error("Error verifying API Key:", error);
        res.status(500).json({ error: "Error verifying API Key." });
    }
});

// Handle Stripe Payment Success
router.get("/stripe/response", handleStripeResponse);

// Serve dynamic page (GET /:pagename)
router.get("/:pagename", getDailyLimiter, async (req, res, next) => {
    if (req.params.pagename.includes(".")) return next(); // ✅ Don't match static files

    const { pagename } = req.params;
    // Ensure these are defined before using them
    const templatePath = path.join(__dirname, "../dynamic", "page.html");
    const privatePageNotFoundPath = path.join(__dirname, "../dynamic", "page_not_found.html");
    const privatePageAccessPath = path.join(__dirname, "../dynamic", "password.html");
    const invalidPagePath = path.join(__dirname, "../dynamic", "invalid_page.html");

    // ✅ Make sure we define these paths correctly
    const passwordFormPath = path.join(__dirname, "../dynamic", "partials", "password_form.html");
    const linkFormPath = path.join(__dirname, "../dynamic", "partials", "link_form.html");  // ✅ Fix added

    if (!fs.existsSync(templatePath)) {
        return res.status(500).send(`<h1>500 - Template Not Found</h1><p>Path: ${templatePath}</p>`);
    }

    try {
        let isPrivatePage = pagename.startsWith("~");
        let hasPostingAccess = false;
        let hasViewingAccess = false;

        if (isPrivatePage) {
            const privatePageResult = await pool.query(
                "SELECT posting_password, viewing_password FROM private_pages WHERE page = $1",
                [pagename]
            );

            if (privatePageResult.rows.length === 0) {
                return res.sendFile(privatePageNotFoundPath);
            }

            const { posting_password, viewing_password } = privatePageResult.rows[0];
            const authCookieName = `auth_${pagename}`;
            const authToken = req.cookies[authCookieName];

            if (!authToken) {
                return res.sendFile(privatePageAccessPath);
            }

            const tokenPayload = validateAuthToken(authToken);
            if (!tokenPayload || tokenPayload.page !== pagename) {
                return res.sendFile(privatePageAccessPath);
            }

            if (tokenPayload.hashedPassword === posting_password) {
                hasPostingAccess = true;
                hasViewingAccess = true;
            } else if (tokenPayload.hashedPassword === viewing_password) {
                hasViewingAccess = true;
            } else {
                return res.sendFile(privatePageAccessPath);
            }
        } else {
            hasPostingAccess = true;
            hasViewingAccess = true;
        }

        // Validate page name
        const pageValidation = validatePageName(pagename);
        if (!pageValidation.valid) {
            return res.sendFile(invalidPagePath);
        }

        // Load page contents
        const result = await pool.query(
            "SELECT link, description FROM links WHERE page = $1 ORDER BY created_at ASC",
            [pagename]
        );

        let html = fs.readFileSync(templatePath, "utf8");
        html = html.replace(/{{links}}/g, generateStyledEntries(result.rows));
        html = html.replace(/{{pagename}}/g, pagename);

        let formHTML = "";
        if (isPrivatePage && !hasPostingAccess && hasViewingAccess) {
            formHTML = fs.readFileSync(passwordFormPath, "utf8");
            formHTML += `<script type="module" src="/scripts/verify.js" defer></script>`;
        } else if (hasPostingAccess) {
            formHTML = fs.readFileSync(linkFormPath, "utf8");
            formHTML += `<script type="module" src="/scripts/post.js" defer></script>`;
        }

        html = html.replace("{{form}}", formHTML);

        res.send(html);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("<h1>500 - Database Error</h1>");
    }
});

// Serve only new rows based on the current length of the table in the frontend
router.get('/api/:pagename/new', async (req, res) => {
    const { pagename } = req.params;
    const offset = parseInt(req.query.offset, 10) || 0; // Number of rows the frontend already has

    // Validate page name
    const pageValidation = validatePageName(pagename);
    if (!pageValidation.valid) {
        return res.status(400).send("<tr><td colspan='2'>Invalid page name.</td></tr>");
    }

    try {
        if (pagename.startsWith("~")) {
            // Ensure private pages have at least one password
            const privatePageResult = await pool.query(
                'SELECT posting_password, viewing_password FROM private_pages WHERE page = $1',
                [pagename]
            );

            if (privatePageResult.rows.length === 0) {
                return res.status(404).send("<tr><td colspan='2'>Private page not found.</td></tr>");
            }

            const { posting_password, viewing_password } = privatePageResult.rows[0];

            if (!posting_password && !viewing_password) {
                return res.status(403).send("<tr><td colspan='2'>Private page requires at least one password.</td></tr>");
            }
        }

        // Fetch only new rows (oldest first for offset to work)
        const result = await pool.query(
            'SELECT link, description FROM links WHERE page = $1 ORDER BY created_at ASC OFFSET $2',
            [pagename, offset]
        );

        // Reverse the rows to maintain `DESC` order before sending
        const reversedRows = result.rows.reverse();

        // Convert new rows to HTML format using `generateStyledEntries`
        const linksHTML = generateStyledEntries(reversedRows);

        res.send(linksHTML);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Catch-all for unknown routes
router.use((req, res) => {
    const invalidPagePath = path.join(__dirname, '../dynamic', 'invalid_page.html');
    res.status(404).sendFile(invalidPagePath);
});

export default router;
