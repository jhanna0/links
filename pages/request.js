// request.js
// This client-side file wraps the shared validators and provides form submission helpers.

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
        console.log("values: ", values);
        if (!values) return; // Abort submission if validation fails.

        try {
            const { response, responseData } = await submitForm(form, values);

            if (!response) {
                console.error("No response from server.");
                alert("Unable to connect to the server. Please try again later.");
                return;
            }

            if (response.status === 429) {
                console.error("Rate limit exceeded:", responseData?.error);
                alert(response.error);
            }
            else if (response.ok) {
                onSuccess && onSuccess(values, responseData);
            }
            else if (response.status === 500) {
                console.error("Server error:", responseData?.error || "Database failure");
                alert(responseData?.error || "A server error occurred. Please try again later.");
            }
            else if (response.status >= 400 && response.status < 500) {
                console.error("Validation error:", responseData?.error || "Unknown validation issue");
                alert(responseData?.error || "Something went wrong. Please check your input.");
                onFailure && onFailure(responseData?.error);
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


