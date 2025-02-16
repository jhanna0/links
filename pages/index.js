// homePage.js
import { validatePageName, validateLink, validateDescription } from "/common/validator.mjs";
import { attachFormSubmission } from "./request.js";

document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // Element Selections
    // ===============================
    // Form & related inputs
    const form = document.querySelector("form");
    const linkInput = document.getElementById("link");
    const descriptionInput = document.getElementById("description");

    // Home page–specific elements
    const pageNameInput = document.getElementById("page");
    const goButton = document.getElementById("goButton");

    // Access toggling elements
    const accessContainer = document.querySelector(".access");
    const accessBtn = document.querySelector(".access-button");
    const homeContainer = document.querySelector(".home-container");

    // API key elements
    const apiKeyInput = document.getElementById("apiKey");
    const saveButton = document.getElementById("saveApiKey");

    // Labels
    const pageLabel = document.getElementById("pageLabel");
    const linkLabel = document.getElementById("linkLabel");
    const descriptionLabel = document.getElementById("descriptionLabel");

    // Store original labels text
    const originalPageLabel = pageLabel.textContent;
    const originalLinkLabel = linkLabel.textContent;
    const originalDescriptionLabel = descriptionLabel.textContent;

    // ===============================
    // API Key Functionality
    // ===============================
    // Load saved API key from local storage (if exists)
    const savedKey = localStorage.getItem("userApiKey");
    if (savedKey && apiKeyInput) {
        apiKeyInput.value = savedKey;
    }
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                localStorage.setItem("userApiKey", key);
                alert("API key saved locally.");
            } else {
                localStorage.removeItem("userApiKey"); // Remove stored key if blank
                alert("API key removed.");
            }
        });
    }

    // ===============================
    // Access Container Toggling
    // ===============================
    if (accessBtn && accessContainer) {
        accessBtn.addEventListener("click", () => {
            accessContainer.classList.toggle("hidden");
            if (accessContainer.classList.contains("hidden")) {
                accessBtn.textContent = "Increase access";
            } else {
                accessBtn.textContent = "Decrease access";
            }
        });
    }

    // fixing jumping text?
    // if (homeContainer) {
    //     homeContainer.classList.remove("hidden");
    // }

    // ===============================
    // Form Validation & Submission
    // ===============================
    /**
     * Reads and validates form values.
     * Returns { page, link, description } if valid, or null if not.
     */
    function getFormValues() {
        const page = pageNameInput ? pageNameInput.value.trim() : "";
        let link = linkInput ? linkInput.value.trim() : "";
        const description = descriptionInput ? descriptionInput.value.trim() : "";

        if (page === "") {
            pageLabel.textContent = originalPageLabel; // Restore default label
            goButton.classList.add("hidden");
            return null;
        }

        if (page) {

            const page_result = validatePageName(page);

            if (!page_result.valid) {
                pageLabel.textContent = page_result.error
                goButton.classList.add("hidden");
                return null;
            }

            pageLabel.textContent = originalPageLabel;
            goButton.classList.remove("hidden");
        }

        if (link) {
            if (!/^https?:\/\//i.test(link)) {
                link = `https://${link}`;
                linkInput.value = link; // Update the input field
            }

            const link_result = validateLink(link);

            if (!link_result.valid) {
                linkLabel.textContent = link_result.error
                return null;

            } else {
                linkLabel.textContent = originalLinkLabel;
            }

        }

        if (description) {
            const description_result = validateDescription(description);

            if (!description_result.valid) {
                descriptionLabel.textContent = description_result.error
                return null;

            } else {
                descriptionLabel.textContent = originalDescriptionLabel;
            }

        }

        return { page, link, description };
    }

    /**
     * Called on successful submission.
     * Clears inputs and redirects if necessary.
     */
    function onSuccess(formValues, responseData) {
        if (linkInput) linkInput.value = "";
        if (descriptionInput) descriptionInput.value = "";
        if (goButton) goButton.style.visibility = "hidden";

        // If a page name is provided and we aren’t on that page, redirect.
        if (formValues.page && window.location.pathname !== `/${formValues.page}`) {
            if (pageNameInput) pageNameInput.value = "";
            window.location.href = `/${formValues.page}`;
        }
    }

    /**
     * Called on submission failure.
     * Displays error messages.
     */
    function onFailure(errorMessage) {
        console.error("Submission failed:", errorMessage);
        if (errorMessage.includes("page") || errorMessage.includes("Page")) {
            pageLabel.textContent = errorMessage;

        } else if (errorMessage.includes("link")) {
            linkLabel.textContent = errorMessage;
        }

        else if (errorMessage.includes("description")) {
            descriptionLabel.textContent = errorMessage;
        }
    }

    // Attach the common submission handler.
    if (form) {
        attachFormSubmission(form, getFormValues, onSuccess, onFailure);
    }

    // ===============================
    // Live Input Validations
    // ===============================
    // Validate page name on input.
    if (pageNameInput) {
        pageNameInput.addEventListener("input", () => {
            const page = pageNameInput.value.trim();
            const result = validatePageName(page);

            if (page === "") {
                pageLabel.textContent = originalPageLabel; // Reset to default
                goButton.classList.add("hidden");
            } else if (!result.valid) {
                pageLabel.textContent = result.error;
                goButton.classList.add("hidden");
            } else {
                pageLabel.textContent = originalPageLabel; // Restore default
                goButton.classList.remove("hidden");
            }
        });
    }

    if (linkInput) {
        linkInput.addEventListener("input", () => {
            linkLabel.textContent = originalLinkLabel; // Reset error
        });
    }

    if (descriptionInput) {
        descriptionInput.addEventListener("input", () => {
            descriptionLabel.textContent = originalDescriptionLabel; // Reset error
        });
    }

    // "Go" button redirects if page name is valid.
    if (goButton && pageNameInput) {
        goButton.addEventListener("click", () => {
            const page = pageNameInput.value.trim();
            if (page && validatePageName(page)) {
                window.location.href = `/${page}`;
            }
        });
    }
});
