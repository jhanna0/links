// routes.js (ES Module version)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { validatePageName, validateLink, validateDescription } from "./common/validator.js";
import { generateSecureString, generateStyledEntries, generateSalt, hashPassword, generateAuthToken, validateAuthToken } from "./common/utils.js";

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

// Serve dynamic page (GET /:pagename)
router.get('/:pagename', async (req, res) => {
    const { pagename } = req.params;

    // Predefined HTML path constants
    const templatePath = path.join(__dirname, 'pages', 'page.html');
    const privatePageNotFoundPath = path.join(__dirname, 'pages', 'page_not_found.html');
    const privatePageAccessPath = path.join(__dirname, 'pages', 'password.html');
    const invalidPagePath = path.join(__dirname, 'pages', 'invalid_page.html');

    // Partial templates for forms
    const passwordFormPath = path.join(__dirname, 'pages', 'password_form.html');
    const linkFormPath = path.join(__dirname, 'pages', 'link_form.html');

    if (!fs.existsSync(templatePath)) {
        return res.status(500).send('<h1>500 - Template Not Found</h1>');
    }

    try {
        let isPrivatePage = pagename.startsWith("~");
        let hasPostingAccess = false;
        let hasViewingAccess = false;

        if (isPrivatePage) {
            const privatePageResult = await pool.query(
                'SELECT posting_password, viewing_password FROM private_pages WHERE page = $1',
                [pagename]
            );

            if (privatePageResult.rows.length === 0) {
                return res.sendFile(privatePageNotFoundPath); // ❌ Private page does not exist
            }

            const { posting_password, viewing_password } = privatePageResult.rows[0];
            const authCookieName = `auth_${pagename}`;
            const authToken = req.cookies[authCookieName];

            if (!authToken) {
                return res.sendFile(privatePageAccessPath); // 🔐 Prompt for password if token missing
            }

            const tokenPayload = validateAuthToken(authToken);
            if (!tokenPayload || tokenPayload.page !== pagename) {
                return res.sendFile(privatePageAccessPath); // ❌ Invalid or expired token → Re-prompt
            }

            if (tokenPayload.hashedPassword === posting_password) {
                hasPostingAccess = true;
                hasViewingAccess = true;
            } else if (tokenPayload.hashedPassword === viewing_password) {
                hasViewingAccess = true;
            } else {
                return res.sendFile(privatePageAccessPath);
            }
        }

        else {
            hasPostingAccess = true;
            hasViewingAccess = true;
        }

        // Validate page name
        const pageValidation = validatePageName(pagename);
        if (!pageValidation.valid) {
            return res.sendFile(invalidPagePath);
        }

        // Load public or unlocked private page
        const result = await pool.query(
            'SELECT link, description FROM links WHERE page = $1 ORDER BY created_at ASC',
            [pagename]
        );

        let html = fs.readFileSync(templatePath, 'utf8');
        html = html.replace(/{{links}}/g, generateStyledEntries(result.rows));
        html = html.replace(/{{pagename}}/g, pagename);

        // ✅ Inject correct form (either password form or link submission form)
        let formHTML = '';
        if (isPrivatePage && !hasPostingAccess && hasViewingAccess) {
            formHTML = fs.readFileSync(passwordFormPath, 'utf8'); // Password input form
        } else if (hasPostingAccess) {
            formHTML = fs.readFileSync(linkFormPath, 'utf8'); // Posting form
        }

        html = html.replace('{{form}}', formHTML);

        // ✅ Inject correct JavaScript
        let scripts = '<script src="page.js" type="module" defer></script>';
        if (isPrivatePage && !hasPostingAccess && hasViewingAccess) {
            scripts += '<script src="verify.js" type="module" defer></script>'; // Only viewing access
        } else if (hasPostingAccess) {
            scripts += '<script src="post.js" type="module" defer></script>'; // Can post
        }

        html = html.replace('</body>', `${scripts}</body>`);

        res.send(html);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).send('<h1>500 - Database Error</h1>');
    }
});

// Serve only new rows based on the current length of the table in the frontend
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

router.post('/create-private-page', async (req, res) => {
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

        const postingPassword = generateSecureString(8);
        const viewingPassword = generateSecureString(8);

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
