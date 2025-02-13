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

// Handle form submissions
// Handle form submissions
app.post('/add', (req, res) => {
    let { page, link, description = '' } = req.body;

    if (!page || !link) {
        return res.status(400).json({ error: 'Page name and link are required' });
    }

    // ✅ Ensure inputs are within 1000 characters
    if (page.length > 1000 || link.length > 1000 || description.length > 1000) {
        return res.status(400).json({ error: 'Inputs cannot exceed 1000 characters.' });
    }

    // ✅ Only allow letters, numbers, dashes, and underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(page)) {
        return res.status(400).json({ error: 'Invalid page name. Use only letters, numbers, dashes, or underscores.' });
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

    let html = fs.readFileSync(templatePath, 'utf8');

    html = html.replace(/{{pagename}}/g, pagename);

    // Generate a clickable name instead of displaying full links
    let linksHTML = pageData.length
        ? pageData.map(entry => {
            let displayName = entry.link;

            // If it's a YouTube link, display "YouTube"
            if (entry.link.includes('youtube.com') || entry.link.includes('youtu.be')) {
                displayName = 'YouTube';
            }
            // Otherwise, show the site's domain as the name
            else {
                try {
                    const urlObj = new URL(entry.link);
                    displayName = urlObj.hostname.replace('www.', '');
                } catch (error) {
                    console.error('Invalid URL:', entry.link);
                }
            }

            return `
                <tr>
                    <td><a href="${entry.link}" target="_blank">${displayName}</a></td>
                    <td>${entry.description || 'No description'}</td>
                </tr>`;
        }).join('')
        : '<tr><td colspan="2">No links added yet.</td></tr>';

    html = html.replace(/{{links}}/g, linksHTML);

    res.send(html);
});



// Start the server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
