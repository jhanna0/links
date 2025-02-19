// routes.js (ES Module version)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { validatePageName, validateLink, validateDescription } from "./common/validator.js";
import { generateSecureString, verifyPassword, generateStyledEntries, generateSalt, hashPassword, generateAuthToken, validateAuthToken } from "./common/utils.js";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve the homepage (GET /)
router.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// Handle form submissions (POST /add)
router.post('/add', async (req, res) => {
    let { page, link, description = '', password } = req.body;

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
            'SELECT posting_password, salt FROM private_pages WHERE page = $1',
            [page]
        );

        if (privatePageResult.rows.length > 0) {
            // The page is private, require a password
            if (!password) {
                return res.status(403).json({ error: '🔒 Password required to post to this private page.' });
            }

            const { posting_password, salt } = privatePageResult.rows[0];
            const hashedPassword = verifyPassword(password, posting_password, salt);

            if (!hashedPassword) {
                return res.status(403).json({ error: '❌ Incorrect password for posting.' });
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

// Serve dynamic page (GET /:pagename)
router.get('/:pagename', async (req, res) => {
    const { pagename } = req.params;
    const templatePath = path.join(__dirname, 'pages', 'page.html');
    const privatePageNotFoundPath = path.join(__dirname, 'pages', 'page_not_found.html');
    const privatePageAccessPath = path.join(__dirname, 'pages', 'password.html');

    if (!fs.existsSync(templatePath)) {
        return res.status(500).send('<h1>500 - Template Not Found</h1>');
    }

    try {
        if (pagename.startsWith("~")) {
            const privatePageResult = await pool.query(
                'SELECT posting_password, viewing_password, salt FROM private_pages WHERE page = $1',
                [pagename]
            );

            if (privatePageResult.rows.length === 0) {
                return res.sendFile(privatePageNotFoundPath); // ❌ Private page does not exist
            }

            // 🔒 Get stored credentials
            const { posting_password, viewing_password, salt } = privatePageResult.rows[0];

            // ✅ Check for the auth token in the cookie for this page
            const authCookieName = `auth_${pagename}`;
            const authToken = req.cookies[authCookieName];

            if (!authToken) {
                return res.sendFile(privatePageAccessPath); // 🔐 Prompt for password if token missing
            }

            // Validate the token using our util function
            const tokenPayload = validateAuthToken(authToken);
            if (!tokenPayload) {
                return res.sendFile(privatePageAccessPath); // ❌ Invalid or expired token → Re-prompt
            }

            // Optionally, ensure the token is for the correct page
            if (tokenPayload.page !== pagename) {
                return res.sendFile(privatePageAccessPath);
            }

            // Optionally, verify that the token’s hashedPassword matches one of the stored hashes
            if (
                tokenPayload.hashedPassword !== posting_password &&
                tokenPayload.hashedPassword !== viewing_password
            ) {
                return res.sendFile(privatePageAccessPath);
            }
            // ✅ If all checks pass, continue loading the page
        }

        // 🆓 Load public or unlocked private page
        const result = await pool.query(
            'SELECT link, description FROM links WHERE page = $1 ORDER BY created_at ASC',
            [pagename]
        );

        let html = fs.readFileSync(templatePath, 'utf8');
        html = html.replace(/{{links}}/g, generateStyledEntries(result.rows));
        html = html.replace(/{{pagename}}/g, pagename);

        res.send(html);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('<h1>500 - Database Error</h1>');
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
        // Fetch only new rows (oldest first for offset to work)
        const result = await pool.query(
            'SELECT link, description FROM links WHERE page = $1 ORDER BY created_at ASC OFFSET $2',
            [pagename, offset]
        );

        // Reverse the rows to maintain `DESC` order before sending
        const reversedRows = result.rows.reverse();

        // Convert new rows to HTML format using `parseDisplayName`
        const linksHTML = generateStyledEntries(reversedRows)

        res.send(linksHTML);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/create-private-page', async (req, res) => {
    try {
        // Generate unique page name & passwords
        const pageName = "~" + generateSecureString(8);
        const postingPassword = generateSecureString(8);
        const viewingPassword = generateSecureString(8);

        // Generate salt & hash passwords
        const salt = generateSalt();
        const hashedPostingPassword = hashPassword(postingPassword, salt);
        const hashedViewingPassword = hashPassword(viewingPassword, salt);

        // Store in database
        await pool.query(`
            INSERT INTO private_pages (page, posting_password, viewing_password, salt)
            VALUES ($1, $2, $3, $4)
        `, [pageName, hashedPostingPassword, hashedViewingPassword, salt]);

        // ✅ Send response with raw passwords
        res.json({
            success: true,
            pageUrl: `https://linkstash.co/${pageName}`,
            postingPassword,
            viewingPassword
        });

    } catch (err) {
        console.error('❌ Error creating private page:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /login for authenticating private pages
router.post('/verify', async (req, res) => {
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


export default router;
