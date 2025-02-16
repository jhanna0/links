// routes.js (ES Module version)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { validatePageName, validateLink, escapeHtml, validateDescription } from "./common/validator.js";
import { parseDisplayName } from "./common/utils.js";

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
        const insertQuery = `
            INSERT INTO links (page, link, description)
            VALUES ($1, $2, $3) 
            ON CONFLICT (page, link, description) DO NOTHING
        `;

        const result = await pool.query(insertQuery, [page, link, description]);

        if (result.rowCount === 0) {
            return res.status(200).json({ success: true, message: "Entry already exists." });
        }

        res.status(201).json({ success: true, message: "Page added successfully" });

    } catch (err) {
        console.error('Database error on insert:', err);
        res.status(500).json({ error: 'Database error' });
    }

});

// Serve dynamic page (GET /:pagename)
router.get('/:pagename', async (req, res) => {
    const { pagename } = req.params;
    const templatePath = path.join(__dirname, 'pages', 'page.html');

    if (!fs.existsSync(templatePath)) {
        return res.status(500).send('<h1>500 - Template Not Found</h1>');
    }

    const pageValidation = validatePageName(pagename);
    const allowAppending = pageValidation.valid;

    let pageData = [];
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
    }

    let html = fs.readFileSync(templatePath, 'utf8');
    html = html.replace(/{{pagename}}/g, pagename);
    html = html.replace(/{{allowAppending}}/g, allowAppending ? "true" : "false");

    let linksHTML = "";
    if (pageData.length) {
        linksHTML = generateTableRows(pageData)
    }

    html = html.replace(/{{links}}/g, linksHTML);
    res.send(html);
});

// Serve only new rows based on the current length of the table in the frontend
router.get('/api/:pagename/new', async (req, res) => {
    const { pagename } = req.params;
    const offset = parseInt(req.query.offset, 0) || 0; // Number of rows the frontend already has

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
        const linksHTML = generateTableRows(reversedRows)

        res.send(linksHTML);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});


function generateTableRows(entries) {
    return entries.map(entry => `
        <tr onclick="window.open('${entry.link}', '_blank')" style="cursor: pointer;">
            <td>
                <a href="${entry.link}" target="_blank" title="${entry.link}" onclick="event.stopPropagation();">
                    ${parseDisplayName(entry.link)}
                </a>
            </td>
            <td>${escapeHtml(entry.description || "No description")}</td>
        </tr>
    `).join('');
}

export default router;
