// routes.js (ES Module version)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import punycode from 'punycode';
import pool from './db.js';
import { validatePageName, validateLink, escapeHtml } from "./common/validator.js";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Handle form submissions (POST /add)
router.post('/add', async (req, res) => {
    let { page, link, description = '' } = req.body;

    if (!page || !link) {
        return res.status(400).json({ error: 'Page name and link are required' });
    }

    // Validate page name
    const pageValidation = validatePageName(page);
    if (!pageValidation.valid) {
        return res.status(400).json({ error: pageValidation.error });
    }

    // Ensure inputs are within character limits
    if (link.length > 500 || description.length > 100) {
        return res.status(400).json({ error: 'Link cannot exceed 500 characters, description 100.' });
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

    try {
        // Check for duplicate entry
        const duplicateCheckQuery = `
            SELECT id 
            FROM links 
            WHERE page = $1 AND link = $2 AND description = $3
            LIMIT 1
        `;
        const duplicateResult = await pool.query(duplicateCheckQuery, [page, link, description]);
        if (duplicateResult.rows.length > 0) {
            return res.status(200).json({ success: true, message: "Entry already exists." });
        }

        // Insert the new link entry
        await pool.query(
            'INSERT INTO links (page, link, description) VALUES ($1, $2, $3)',
            [page, link, description]
        );
        res.status(201).json({ success: true, message: "Page added successfully" });
    } catch (err) {
        console.error('Database error on insert:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Serve the homepage (GET /)
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// Serve dynamic page (GET /:pagename)
router.get('/:pagename', async (req, res) => {
    const { pagename } = req.params;
    const templatePath = path.join(__dirname, 'pages', 'page.html');

    if (!fs.existsSync(templatePath)) {
        return res.status(500).send('<h1>500 - Template Not Found</h1>');
    }

    // Validate the page name; if invalid, disallow appending new links
    const pageValidation = validatePageName(pagename);
    const allowAppending = pageValidation.valid;
    console.log(`Page: "${pagename}" valid:`, allowAppending);

    let pageData = [];
    // Only query PostgreSQL if the page name is valid.
    if (allowAppending) {
        try {
            const result = await pool.query(
                'SELECT link, description FROM links WHERE page = $1 ORDER BY created_at ASC',
                [pagename]
            );
            pageData = result.rows;
        } catch (err) {
            console.error('Database error on select:', err);
            return res.status(500).send('<h1>500 - Database Error</h1>');
        }
    } else {
        console.log(`Invalid page name "${pagename}" – skipping database query.`);
    }

    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace(/{{pagename}}/g, pagename);
    // You can still replace the placeholder for UI purposes if needed.
    html = html.replace(/{{allowAppending}}/g, allowAppending ? "true" : "false");

    // Generate the table rows for links (if any)
    let linksHTML = "";
    if (pageData.length) {
        linksHTML = pageData.map(entry => {
            let displayName = entry.link;
            if (entry.link.includes('youtube.com') || entry.link.includes('youtu.be')) {
                displayName = 'YouTube';
            } else {
                try {
                    const urlObj = new URL(entry.link);
                    let hostname = urlObj.hostname.replace('www.', '');
                    // Perform punycode conversion on the backend if needed.
                    if (hostname.startsWith("xn--")) {
                        hostname = punycode.toUnicode(hostname);
                    }
                    displayName = hostname.replace(/\.[a-zA-Z]{2,}$/, '');
                } catch (error) {
                    console.error('Invalid URL:', entry.link);
                }
            }
            const safeDescription = escapeHtml(entry.description || 'No description');
            return `
                <tr>
                  <td>
                    <a href="${entry.link}" target="_blank" title="${entry.link}">
                      ${displayName}
                    </a>
                  </td>
                  <td>${safeDescription}</td>
                </tr>`;
        }).join('');
    } else if (allowAppending) {
        // Show a message when no links exist yet, but only if appending is allowed.
        linksHTML = `
            <tr>
              <td colspan="2" style="text-align: left; color: var(--text-color);">
                No links added yet.
              </td>
            </tr>`;
    }

    else if (!allowAppending) {
        linksHTML = `
        <tr>
          <td colspan="2" style="text-align: left; color: var(--error-color);">
            This page is invalid.
          </td>
        </tr>`;
    }

    html = html.replace(/{{links}}/g, linksHTML);
    res.send(html);
});


export default router;
