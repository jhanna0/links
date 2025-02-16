// page.js
import { validatePageName, validateLink, validateDescription } from "/common/validator.mjs";
import { attachFormSubmission } from "./request.js";

document.addEventListener("DOMContentLoaded", () => {
    // ======================================================
    // Element Selections (using IDs only)
    // ======================================================
    const form = document.getElementById("form");
    const formContainer = document.getElementById("formContainer");
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

    function onSuccess(formValues, responseData) {
        console.log("Submission successful!", responseData);
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
});
