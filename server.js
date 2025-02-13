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
app.post('/add', (req, res) => {
    const { page, link, description = '' } = req.body;
    if (!page || !link) {
        return res.status(400).json({ error: 'Page name and link are required' });
    }

    let data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
    if (!data[page]) data[page] = [];
    data[page].push({ link, description });

    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

    res.redirect(`/${page}`);
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

    let linksHTML = pageData.length
        ? pageData.map(entry =>
            `<tr>
                <td><a href="${entry.link}" target="_blank">${entry.link}</a></td>
                <td>${entry.description || 'No description'}</td>
            </tr>`
        ).join('')
        : '<tr><td colspan="2">No links added yet.</td></tr>';

    html = html.replace(/{{links}}/g, linksHTML);

    res.send(html);
});


// Start the server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
