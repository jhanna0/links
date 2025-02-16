// page.js
import { validatePageName, validateLink, validateDescription } from "/common/validator.mjs";
import { attachFormSubmission, fetchUpdatedTable } from "./request.js";

document.addEventListener("DOMContentLoaded", () => {
    // ======================================================
    // Element Selections (using IDs only)
    // ======================================================
    const form = document.getElementById("form");
    const formContainer = document.getElementById("formContainer");
    const toggleButton = document.getElementById("toggleFormButton");

    const linkInput = document.getElementById("linkPage");
    const descriptionInput = document.getElementById("descriptionPage");
    const pageNameInput = document.getElementById("pagePage"); // Hidden input
    const linksTable = document.getElementById("pageTable");

    // Labels
    const linkLabel = document.getElementById("linkLabel");
    const descriptionLabel = document.getElementById("descriptionLabel");

    // Page Navigation & Buttons
    const pageHeadingBack = document.getElementById("pageHeadingBack");
    const shareButton = document.getElementById("pageNameHeading");

    const noRowsMessage = document.getElementById("noRowsMessage");
    const invalidMessage = document.getElementById("invalidMessage");

    // Store original labels text
    const originalLinkLabel = linkLabel ? linkLabel.textContent : "";
    const originalDescriptionLabel = descriptionLabel ? descriptionLabel.textContent : "";

    // ======================================================
    // Form Validation & Submission
    // ======================================================
    function getFormValues() {
        const page = pageNameInput ? pageNameInput.value.trim() : "";
        let link = linkInput ? linkInput.value.trim() : "";
        const description = descriptionInput ? descriptionInput.value.trim() : "";

        if (link) {
            if (!/^https?:\/\//i.test(link)) {
                link = `https://${link}`;
                linkInput.value = link; // Update the input field
            }

            const linkResult = validateLink(link);
            if (!linkResult.valid) {
                if (linkLabel) linkLabel.textContent = linkResult.error;
                return null;
            } else {
                if (linkLabel) linkLabel.textContent = originalLinkLabel;
            }
        }

        if (description) {
            const descriptionResult = validateDescription(description);
            if (!descriptionResult.valid) {
                if (descriptionLabel) descriptionLabel.textContent = descriptionResult.error;
                return null;
            } else {
                if (descriptionLabel) descriptionLabel.textContent = originalDescriptionLabel;
            }
        }

        return { page, link, description };
    }

    function updateTableMessage() {
        let allowed = allowAppending.valid;
        const rowCount = linksTable.querySelectorAll("tr").length;
        if (rowCount === 0) {
            if (allowed) {
                noRowsMessage.style.display = "block";
                invalidMessage.style.display = "none";
            } else {
                invalidMessage.style.display = "block";
                noRowsMessage.style.display = "none";
            }
        } else {
            noRowsMessage.style.display = "none";
            invalidMessage.style.display = "none";
        }
    }

    async function updateLinksTable(page) {
        if (!page) return;

        if (!linksTable) return;

        try {
            // Current row count for next page
            //suseptible to row manipulation if user manually adds rows
            const currentCount = linksTable.querySelectorAll("tr").length;

            // Use the centralized request function
            const newHTML = await fetchUpdatedTable(page, currentCount);
            if (!newHTML || !newHTML.trim()) {
                console.log("No new rows to add.");
                return;
            }

            const tbody = document.querySelector("#pageTable tbody");
            if (tbody) {
                tbody.insertAdjacentHTML("beforeend", newHTML);
                updateTableMessage();
            }

        } catch (error) {
            console.error("Error updating table:", error);
        }
    }

    function onSuccess(formValues, responseData) {
        if (linkInput) linkInput.value = "";
        if (descriptionInput) descriptionInput.value = "";

        if (formValues.page && window.location.pathname !== `/${formValues.page}`) {
            window.location.href = `/${formValues.page}`;
        } else {
            updateLinksTable(formValues.page);
        }
    }

    function onFailure(errorMessage) {
        console.error("Submission failed:", errorMessage);
        if (errorMessage.includes("link")) {
            if (linkLabel) linkLabel.textContent = errorMessage;
        } else if (errorMessage.includes("description")) {
            if (descriptionLabel) descriptionLabel.textContent = errorMessage;
        }
    }

    if (form) {
        attachFormSubmission(form, getFormValues, onSuccess, onFailure);
    }

    // ======================================================
    // Live Input Validations
    // ======================================================
    if (linkInput) {
        linkInput.addEventListener("input", () => {
            if (linkLabel) linkLabel.textContent = originalLinkLabel;
        });
    }

    if (descriptionInput) {
        descriptionInput.addEventListener("input", () => {
            if (descriptionLabel) descriptionLabel.textContent = originalDescriptionLabel;
        });
    }

    // ======================================================
    // Additional Page Functionality
    // ======================================================
    const pageNameValue = pageNameInput ? pageNameInput.value.trim() : "";
    const allowAppending = validatePageName(pageNameValue);
    updateTableMessage();

    if (!allowAppending) {
        if (formContainer) {
            formContainer.style.pointerEvents = "none";
            formContainer.style.opacity = 0.75;
        }
    }

    if (pageHeadingBack) {
        pageHeadingBack.addEventListener("click", () => {
            if (document.referrer.endsWith("/")) {
                window.history.back();
            } else {
                window.location.href = "/";
            }
        });
        pageHeadingBack.style.cursor = "pointer";
    }

    if (shareButton) {
        shareButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                shareButton.style.opacity = "0.50";
                setTimeout(() => {
                    shareButton.style.opacity = "1.0";
                }, 1200);
            } catch (err) {
                console.error("Clipboard copy failed:", err);
            }
        });
    }

    toggleButton.addEventListener("click", function () {
        if (formContainer.classList.contains("hidden")) {
            formContainer.classList.remove("hidden");
            formContainer.classList.add("visible");
            toggleButton.textContent = "Hide Form";
        } else {
            formContainer.classList.remove("visible");
            formContainer.classList.add("hidden");
            toggleButton.textContent = "Show Form";
        }
    });

});

// scrolling

document.addEventListener("wheel", (event) => {
    const tableContainer = document.getElementById("tableContainer");

    if (!tableContainer) return;

    // Detect horizontal swipe (swipe back/forward gesture)
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return; // Ignore and allow the browser to handle it
    }

    // Redirect only vertical scrolls to the table
    tableContainer.scrollBy({
        top: event.deltaY
    });

    event.preventDefault(); // Prevent body scrolling, but not swipe gestures
}, { passive: false }); // Allows preventDefault to work
