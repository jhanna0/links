import punycode from 'punycode';

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
        // return hostname.replace(/\.[a-zA-Z]{2,}$/, "");
        return hostname

    } catch (error) {
        console.error("Invalid URL:", url);
        return url; // If URL parsing fails, return the original link
    }
}
