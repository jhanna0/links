// validator.js
import { ERROR_MESSAGES } from "./messages.js";

/**
 * Validate a page name.
 * @param {string} page - The page name to validate.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePageName(page) {
    if (!page || typeof page !== "string") {
        return { valid: false, error: ERROR_MESSAGES.PAGE_REQUIRED };
    }
    if (page.length > 100) {
        return { valid: false, error: ERROR_MESSAGES.PAGE_TOO_LONG };
    }
    const validPattern = /^[\p{L}\p{N}\+\-\._!~*'()]+$/u;
    if (!validPattern.test(page)) {
        return { valid: false, error: ERROR_MESSAGES.PAGE_INVALID };
    }
    return { valid: true };
}

/**
 * Validate a link.
 * @param {string} link - The link to validate.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLink(link) {
    try {
        const urlObj = new URL(link);
        if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
            return { valid: false, error: ERROR_MESSAGES.LINK_HTTP_ONLY };
        }
        const hostname = urlObj.hostname;
        const domainPattern =
            /^(localhost(:\d{1,5})?|[\p{L}0-9-]+(\.[\p{L}0-9-]+)+|(\d{1,3}\.){3}\d{1,3}|\[[a-fA-F0-9:]+\])$/u;
        if (!domainPattern.test(hostname)) {
            return { valid: false, error: ERROR_MESSAGES.LINK_DOMAIN_INVALID };
        }
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
            const octets = hostname.split(".").map(Number);
            if (octets.some(octet => octet < 0 || octet > 255)) {
                return { valid: false, error: ERROR_MESSAGES.LINK_IP_INVALID };
            }
        }
        return { valid: true };
    } catch (error) {
        return { valid: false, error: ERROR_MESSAGES.LINK_INVALID };
    }
}

/**
 * Validate a description.
 * @param {string} description - The description to validate.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDescription(description) {
    if (!description || typeof description !== "string") {
        return { valid: false, error: ERROR_MESSAGES.DESCRIPTION_REQUIRED };
    }
    if (description.length > 100) {
        return { valid: false, error: ERROR_MESSAGES.DESCRIPTION_TOO_LONG };
    }
    return { valid: true };
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
