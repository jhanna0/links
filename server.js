const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const dataFile = path.join(__dirname, 'data/data.json');

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files (CSS, images, etc.)
app.use(express.static('public'));

/**
 * ✅ Helper Function: Validate Page Name
 * - Ensures only A-Z, 0-9, -, _
 * - Prevents blank names
 * - Limits to 1000 characters
 * - Returns { valid: boolean, error?: string }
 */
function validatePageName(page) {
    if (!page || typeof page !== "string") {
        return { valid: false, error: "Page name is required." };
    }

    if (page.length > 1000) {
        return { valid: false, error: "Page name cannot exceed 1000 characters." };
    }

    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(page)) {
        // this is displaying on link error
        return { valid: false, error: "Invalid page name. Use only letters, numbers, dashes, or underscores." };
    }

    return { valid: true };
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
app.post('/add', (req, res) => {
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
    if (link.length > 1000 || description.length > 1000) {
        return res.status(400).json({ error: 'Inputs cannot exceed 1000 characters.' });
    }

    // ✅ Ensure link has "https://"
    if (!/^https?:\/\//i.test(link)) {
        link = 'https://' + link;
    }

    let data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
    if (!data[page]) data[page] = [];
    data[page].push({ link, description });

    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

    res.status(201).json({ success: true, message: "Page added successfully" });
});

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// Serve one HTML file dynamically for all pages
app.get('/:pagename', (req, res) => {
    const { pagename } = req.params;
    const templatePath = path.join(__dirname, 'pages', 'page.html');

    if (!fs.existsSync(templatePath)) {
        return res.status(500).send('<h1>500 - Template Not Found</h1>');
    }

    let data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
    let pageData = data[pagename] || [];

    // ✅ Validate Page Name - Just Block Posting Instead of Crashing
    const pageValidation = validatePageName(pagename);
    const allowAppending = pageValidation.valid; // If invalid, form will be hidden

    let html = fs.readFileSync(templatePath, 'utf8');

    html = html.replace(/{{pagename}}/g, pagename);
    html = html.replace(/{{allowAppending}}/g, allowAppending ? "true" : "false");

    // Generate a clickable name instead of displaying full links.
    // We add a tooltip (via the title attribute) to show the full URL.
    let linksHTML = pageData.length
        ? pageData.map(entry => {
            let displayName = entry.link;

            // If it's a YouTube link, display "YouTube"
            if (entry.link.includes('youtube.com') || entry.link.includes('youtu.be')) {
                displayName = 'YouTube';
            } else {
                try {
                    const urlObj = new URL(entry.link);
                    displayName = urlObj.hostname.replace('www.', '');
                    displayName = displayName.replace(/\.[a-zA-Z]{2,}$/, '');
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
        }).join('')
        : '<tr><td colspan="2">No links added yet.</td></tr>';

    html = html.replace(/{{links}}/g, linksHTML);

    res.send(html);
});


// Start the server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
