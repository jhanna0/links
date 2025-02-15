// tablePage.js
import { validateLink } from "/common/validator.mjs";
import { validatePageName, attachFormSubmission } from "./request.js";

document.addEventListener("DOMContentLoaded", () => {
    // ======================================================
    // Form Submission Logic
    // ======================================================
    // Common form elements.
    const form = document.querySelector("form");
    const linkInput = document.getElementById("link");
    const descriptionInput = document.getElementById("description");
    const linkError = document.getElementById("linkError");

    // Table page–specific elements.
    const pageNameInput = document.getElementById("page"); // (e.g. a hidden input)
    const linksTable = document.querySelector("table");

    /**
     * Reads and validates the current form values.
     * Returns { page, link, description } if valid; otherwise, returns null.
     */
    function getFormValues() {
        const page = pageNameInput ? pageNameInput.value.trim() : "";
        const link = linkInput ? linkInput.value.trim() : "";
        if (linkInput && !validateLink(link)) {
            if (linkError) {
                linkError.textContent = "(Invalid)";
                linkError.style.visibility = "visible";
            }
            return null;
        }
        const description = descriptionInput ? descriptionInput.value.trim() : "";
        if (description.length > 100) {
            // Optionally display an error for description.
            return null;
        }
        return { page, link, description };
    }

    /**
     * Updates the links table by fetching the latest content.
     * @param {string} page - The page name used to fetch the updated table.
     */
    async function updateLinksTable(page) {
        if (!linksTable || !page) return;
        try {
            const response = await fetch(`/${page}`);
            if (!response.ok) {
                console.error("Failed to fetch updated page data.");
                return;
            }
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const newTableBody = doc.querySelector("table tbody");
            if (newTableBody) {
                linksTable.innerHTML = newTableBody.innerHTML;
                console.log("Table updated successfully!");
            }
        } catch (error) {
            console.error("Error fetching updated links:", error);
        }
    }

    /**
     * Called on successful submission.
     * Clears inputs and updates the table.
     */
    function onSuccess(formValues, responseData) {
        console.log("Submission successful!", responseData);
        if (linkInput) linkInput.value = "";
        if (descriptionInput) descriptionInput.value = "";
        updateLinksTable(formValues.page);
    }

    /**
     * Called on submission failure.
     * Displays error messages.
     */
    function onFailure(errorMessage) {
        console.error("Submission failed:", errorMessage);
        if (linkError) {
            linkError.textContent = errorMessage || "Submission failed.";
            linkError.style.visibility = "visible";
        }
    }

    // Attach the common submission handler.
    // let's say user manually changes the pageName in inspector and submits, we should redirect still to where they changed it!
    if (form) {
        attachFormSubmission(form, getFormValues, onSuccess, onFailure);
    }

    // Clear any link error on user input.
    if (linkInput) {
        linkInput.addEventListener("input", () => {
            if (linkError) linkError.style.visibility = "hidden";
        });
    }

    // ======================================================
    // Additional Page Functionality
    // ======================================================

    // ----- Allow Appending / Container Visibility -----
    // Read `allowAppending` from server-side rendering.
    // (The server should replace "{{allowAppending}}" with "true" or "false".)
    const pageNameValue = pageNameInput ? pageNameInput.value.trim() : "";
    const allowAppending = validatePageName(pageNameValue);

    const formContainer = document.getElementById("formContainer");
    const pageInvalidMessage = document.getElementById("pageInvalidMessage");
    const pageHeading = document.querySelector(".page-heading");

    console.log(allowAppending)

    // Remove "hidden" class from all containers.
    document.querySelectorAll('.container').forEach(container => {
        container.classList.remove("hidden");
    });

    if (!allowAppending) {
        if (pageHeading) {
            pageHeading.style.pointerEvents = "none";
        }
        if (formContainer) {
            formContainer.style.pointerEvents = "none";
            formContainer.style.opacity = 0.75;
        }
        if (pageInvalidMessage) {
            pageInvalidMessage.style.display = "inline-block"; // Show warning message
        }
    }

    // ----- "Page-back" Click Handler -----
    const pageHeadingBack = document.querySelector(".page-back");
    if (pageHeadingBack) {
        pageHeadingBack.addEventListener("click", () => {
            if (document.referrer.endsWith("/")) {
                window.history.back(); // Go back if the referrer was "/"
            } else {
                window.location.href = "/"; // Otherwise, go to "/"
            }
        });
        // Make it look clickable.
        pageHeadingBack.style.cursor = "pointer";
    }

    // ----- Share Button Functionality -----
    const shareButton = document.querySelector(".share");
    if (shareButton) {
        shareButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                // Optionally, you can alert the user here:
                // alert("Page URL copied to clipboard! ✅");
                shareButton.style.opacity = "0.50";
                setTimeout(() => {
                    shareButton.style.opacity = "1.0";
                }, 1200);
            } catch (err) {
                console.error("Clipboard copy failed:", err);
            }
        });
    }
});
