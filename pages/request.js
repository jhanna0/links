// request.js
// This client-side file wraps the shared validators and provides form submission helpers.

import "/alert.js";

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

            // console.log(response, responseData)

            if (!response) {
                console.error("No response from server.");
                alert("Unable to connect to the server. Please try again later.");
                return;
            }

            if (response.status === 429) {
                console.error("Rate limit exceeded:", responseData?.error);
            }
            else if (response.ok) {
                onSuccess && onSuccess(values, responseData);
            }
            else if (response.status === 500) {
                console.error("Server error:", responseData?.error || "Database failure");
                alert(responseData?.error || "A server error occurred. Please try again later.");
            }
            else if (response.status >= 400 && response.status < 500) {
                const errorMsg = responseData?.error || "Unknown validation issue";
                console.error("Validation error:", errorMsg);
                alert(errorMsg);
                onFailure && onFailure(errorMsg);
            }
            else {
                console.error("Unexpected server response:", responseData?.error || "Unknown error");
                alert(responseData?.error || "An unknown error occurred. Please try again.");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
            alert("A network error occurred. Please check your internet connection and try again.");
        }
    });
}

/**
 * Fetches only new rows as raw HTML.
 * The response is pre-rendered, so the frontend just inserts it.
 *
 * @param {string} page - The page name used to fetch the updated table.
 * @param {number} offset - The number of rows the frontend already has.
 * @returns {Promise<string | null>} - The raw HTML response or null on failure.
 */
export async function fetchUpdatedTable(page, offset) {
    if (!page) return null;

    try {
        const response = await fetch(`/api/${page}/new?offset=${offset}`);

        if (response.status === 429) {
            // Handle rate limiting explicitly
            console.warn("Rate limit exceeded: Too many GET requests.");
            alert("You've reached the limit for viewing new links. Try again later.");
            return null; // Stop processing
        }

        if (!response.ok) {
            console.error("Failed to fetch updated page data.");
            return null;
        }

        return await response.text(); // Return raw HTML for `page.js` to handle
    } catch (error) {
        console.error("Error fetching updated links:", error);
        alert("An unknown issue occurred.");
        return null;
    }
}
