const env = require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const punycode = require("punycode/");
const rateLimit = require('express-rate-limit');

const app = express();
const port = 3000; // Hardcoded port

app.set('trust proxy', 1);

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

// ✅ Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use('/add', minuteLimiter, dailyLimiter);

// ✅ Hardcoded PostgreSQL credentials
const pool = new Pool({
    user: env.parsed.USER,
    host: env.parsed.HOST,
    database: env.parsed.DB,
    password: env.parsed.PASSWORD,
    port: env.parsed.PORT,
    ssl: { rejectUnauthorized: false }
});

// ✅ Test PostgreSQL Connection
pool.connect()
    .then(() => {
        console.log('✅ Connected to PostgreSQL');
    })
    .catch(err => {
        console.error('❌ PostgreSQL connection error:', err);
        process.exit(1);
    });

const initDB = async () => {
    const createTableQuery = `
          CREATE TABLE IF NOT EXISTS links (
            id SERIAL PRIMARY KEY,
            page TEXT NOT NULL,
            link TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `;
    try {
        await pool.query(createTableQuery);
        console.log('Database initialized.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDB();

/**
 * ✅ Helper Function: Validate Page Name
 * - Ensures only A-Z, 0-9, -, _
 * - Prevents blank names
 * - Limits to 100 characters
 * - Returns { valid: boolean, error?: string }
 */
function validatePageName(page) {
    if (!page || typeof page !== "string") {
        return { valid: false, error: "Page name is required." };
    }

    if (page.length > 100) {
        return { valid: false, error: "Page name cannot exceed 100 characters." };
    }

    const validPattern = /^[\p{L}\p{N}\+\-\._!~*'()]+$/u;

    if (!validPattern.test(page)) {
        return { valid: false, error: "Invalid page name. Use only letters, numbers, dashes, or underscores." };
    }

    return { valid: true };
}

// get rid of punycode shit we added and deal with it later
// could it be actually returning as punycode? check /getpage and postgres
function validateLink(link) {
    try {
        const urlObj = new URL(link); // Just validates URL structure

        // Reject non-http(s) protocols
        if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
            return { valid: false, error: "Only HTTP and HTTPS links are allowed." };
        }

        // Convert Punycode to Unicode (for validation only, not for modifying the link)
        let decodedHostname = urlObj.hostname.startsWith("xn--")
            ? punycode.toUnicode(urlObj.hostname)
            : urlObj.hostname;

        // Simpler regex to ensure valid domains, IPv4/IPv6, and localhost
        const domainPattern = /^(localhost(:\d{1,5})?|[\p{L}0-9-]+(\.[\p{L}0-9-]+)+|(\d{1,3}\.){3}\d{1,3}|\[[a-fA-F0-9:]+\])$/u;

        if (!domainPattern.test(decodedHostname)) {
            return { valid: false, error: "Invalid domain format." };
        }

        // Prevent out-of-range IPs (ensure valid 0-255 octets)
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(decodedHostname)) {
            const octets = decodedHostname.split('.').map(Number);
            if (octets.some(o => o < 0 || o > 255)) {
                return { valid: false, error: "Invalid IP address." };
            }
        }

        return { valid: true }; // Just return validation status, no modifications
    } catch (error) {
        return { valid: false, error: "Invalid URL format." };
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Handle form submissions
// let's only allow 1000 per page!
app.post('/add', async (req, res) => {
    let { page, link, description = '' } = req.body;

    if (!page || !link) {
        return res.status(400).json({ error: 'Page name and link are required' });
    }

    // ✅ Validate Page Name
    const pageValidation = validatePageName(page);
    if (!pageValidation.valid) {
        return res.status(400).json({ error: pageValidation.error });
    }

    // ✅ Ensure inputs are within 1000 characters
    if (link.length > 500 || description.length > 100) {
        return res.status(400).json({ error: 'Link cannot exceed 500 characters, description 100.' });
    }

    // ✅ Ensure link has "https://"
    if (!/^https?:\/\//i.test(link)) {
        link = 'https://' + link;
    }

    // ✅ Validate the link without modifying it
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

        // ✅ Insert the original, unmodified link
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


// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// Serve one HTML file dynamically for all pages
app.get('/:pagename', async (req, res) => {
    const { pagename } = req.params;
    const templatePath = path.join(__dirname, 'pages', 'page.html');

    if (!fs.existsSync(templatePath)) {
        return res.status(500).send('<h1>500 - Template Not Found</h1>');
    }

    // ✅ Validate Page Name - Just Block Posting Instead of Crashing
    const pageValidation = validatePageName(pagename);
    const allowAppending = pageValidation.valid; // If invalid, form will be hidden

    let pageData = [];
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

    let html = fs.readFileSync(templatePath, 'utf8');

    html = html.replace(/{{pagename}}/g, pagename);
    html = html.replace(/{{allowAppending}}/g, allowAppending ? "true" : "false");

    // Generate a clickable name instead of displaying full links.
    // We add a tooltip (via the title attribute) to show the full URL.
    let linksHTML = "";

    if (pageData.length) {
        linksHTML = pageData.map(entry => {
            let displayName = entry.link;

            // If it's a YouTube link, display "YouTube"
            if (entry.link.includes('youtube.com') || entry.link.includes('youtu.be')) {
                displayName = 'YouTube';
            } else {
                try {
                    const urlObj = new URL(entry.link);
                    let hostname = urlObj.hostname.replace('www.', '');

                    // 🔥 Decode Punycode if necessary
                    if (hostname.startsWith("xn--")) {
                        hostname = punycode.toUnicode(hostname);
                    }

                    displayName = hostname.replace(/\.[a-zA-Z]{2,}$/, ''); // Strip TLD for display
                } catch (error) {
                    console.error('Invalid URL:', entry.link);
                }
            }

            // Escape the description so any HTML is rendered as plain text.
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
        // Show "No links added yet." message, but only if the page is valid
        linksHTML = `
      <tr>
        <td colspan="2" style="text-align: left; color: var(--text-color);">
          No links added yet.
        </td>
      </tr>`;
    }

    // Replace {{links}} in HTML template
    html = html.replace(/{{links}}/g, linksHTML);

    res.send(html);
});

// Start the server
app.listen(port, '0.0.0.0', () => console.log(`🚀 Server running at http://0.0.0.0:${port}`));

