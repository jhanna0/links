// commonFormValidator.js
// This client-side file wraps the shared validators and provides form submission helpers.

import {
    validatePageName as commonValidatePageName,
    validateLink as commonValidateLink,
} from "/common/validator.js";

/**
 * Client wrapper: Validate page name.
 * Returns a boolean so that client code can simply check validity.
 * @param {string} pageName
 * @returns {boolean}
 */
export function validatePageName(pageName) {
    return commonValidatePageName(pageName).valid;
}

/**
 * Client wrapper: Validate link.
 * Returns a boolean.
 * @param {string} link
 * @returns {boolean}
 */
export function validateLink(link) {
    return commonValidateLink(link).valid;
}

/**
 * Helper to perform the POST submission via fetch.
 * @param {HTMLFormElement} form - The form element.
 * @param {Object} values - { page, link, description }
 * @returns {Promise<Object>} - Resolves with { response, responseData }
 */
export async function submitForm(form, values) {
    const formData = new URLSearchParams();
    formData.append("page", values.page);
    formData.append("link", values.link);
    formData.append("description", values.description);
    const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
    });
    const responseData = await response.json();
    return { response, responseData };
}

/**
 * Attaches a submission handler to a form.
 * The getFormValues callback should return { page, link, description } or null if validation fails.
 * onSuccess and onFailure are called based on the outcome.
 *
 * @param {HTMLFormElement} form
 * @param {Function} getFormValues
 * @param {Function} onSuccess
 * @param {Function} onFailure
 */
export function attachFormSubmission(form, getFormValues, onSuccess, onFailure) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = getFormValues();
        if (!values) return; // Abort submission if validation fails.
        try {
            const { response, responseData } = await submitForm(form, values);
            if (response.status === 429) {
                console.error("Rate limit exceeded:", responseData.error);
                onFailure && onFailure(responseData.error);
            } else if (response.ok) {
                onSuccess && onSuccess(values, responseData);
            } else {
                console.error("Submission failed:", responseData.error);
                onFailure && onFailure(responseData.error || "Submission failed.");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            onFailure && onFailure("Network error. Try again.");
        }
    });
}
