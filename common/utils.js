import punycode from 'punycode';
import crypto from 'crypto';

// string functions
/**
 * Extracts a human-friendly display name from a URL.
 * @param {string} url - The full URL.
 * @returns {string} - A short, user-friendly domain name.
 */
export function parseDisplayName(url) {
    try {
        // Handle special cases like YouTube links
        // if (url.includes("youtube.com") || url.includes("youtu.be")) {
        //     return "YouTube";
        // }

        // Extract hostname
        const urlObj = new URL(url);
        let hostname = urlObj.hostname.replace(/^www\./, ""); // Remove "www."

        // Convert punycode (e.g., IDN domains)
        if (hostname.startsWith("xn--")) {
            hostname = punycode.toUnicode(hostname);
        }

        // Remove TLD (.com, .org, etc.)
        return hostname.replace(/\.[a-zA-Z]{2,}$/, "");
        // return hostname

    } catch (error) {
        console.error("Invalid URL:", url);
        return url; // If URL parsing fails, return the original link
    }
}

export function generateStyledEntries(entries) {
    return entries.map(entry => `
        <div class="pill">
            <div class="pill-content" onclick="window.open('${entry.link}', '_blank')">
                <a href="${entry.link}" target="_blank" title="${entry.link}" onclick="event.stopPropagation();">
                    ${parseDisplayName(entry.link)}
                </a>
                <span class="description">${escapeHtml(entry.description || "No description")}</span>
            </div>

            <!-- Link Icon (Opens Modal) -->
            <div class="pill-link-icon" onclick="openLinkModal('${escapeHtml(entry.link)}')">
                ⋮
            </div>
        </div>
    `).join('');
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// hashing
/**
 * Generate a secure random string for page names & passwords
 */
export function generateSecureString(length = 16) {
    return crypto.randomBytes(length).toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters
        .slice(0, length);
}

/**
 * Generate a random salt for password hashing
 */
export function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash a password with a salt
 */
export function hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

/**
 * Verify a password by hashing the input and comparing it to the stored hash
 * @param {string} inputPassword - The password entered by the user
 * @param {string} storedHash - The hashed password stored in the database
 * @param {string} salt - The salt used during hashing
 * @returns {boolean} - True if the password matches, false otherwise
 */
export function verifyPassword(inputPassword, storedHash, salt) {
    const hashedInput = hashPassword(inputPassword, salt);
    return hashedInput === storedHash;
}