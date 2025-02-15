// homePage.js
import { validatePageName, validateLink } from "/common/validator.mjs";
import { attachFormSubmission } from "./request.js";

document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // Element Selections
    // ===============================
    // Form & related inputs
    const form = document.querySelector("form");
    const linkInput = document.getElementById("link");
    const descriptionInput = document.getElementById("description");
    const linkError = document.getElementById("linkError");

    // Home page–specific elements
    const pageNameInput = document.getElementById("page");
    const goButton = document.getElementById("goButton");
    const pageError = document.getElementById("pageError");

    // Access toggling elements
    const accessContainer = document.querySelector(".access");
    const accessBtn = document.querySelector(".access-button");
    const homeContainer = document.querySelector(".home-container");

    // API key elements
    const apiKeyInput = document.getElementById("apiKey");
    const saveButton = document.getElementById("saveApiKey");

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

    if (homeContainer) {
        homeContainer.classList.remove("hidden");
    }

    // ===============================
    // Form Validation & Submission
    // ===============================
    /**
     * Reads and validates form values.
     * Returns { page, link, description } if valid, or null if not.
     */
    function getFormValues() {
        const page = pageNameInput ? pageNameInput.value.trim() : "";
        if (pageNameInput) {
            if (page === "") {
                pageError.textContent = "";
                pageError.style.visibility = "hidden";
                goButton.style.visibility = "hidden";
                return null;
            }
            if (!validatePageName(page)) {
                pageError.textContent = page.length > 100 ? "(Max 100 char)" : "(Invalid)";
                pageError.style.visibility = "visible";
                goButton.style.visibility = "hidden";
                return null;
            }
            pageError.style.visibility = "hidden";
            goButton.style.visibility = "visible";
        }

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
     * Called on successful submission.
     * Clears inputs and redirects if necessary.
     */
    function onSuccess(formValues, responseData) {
        console.log("Submission successful!", responseData);
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
        if (errorMessage.includes("page name") && pageError) {
            pageError.textContent = errorMessage;
            pageError.style.visibility = "visible";
        } else if (linkError) {
            linkError.textContent = errorMessage || "Submission failed.";
            linkError.style.visibility = "visible";
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
            console.log("page")
            if (page === "") {
                // Hide error and Go button when empty
                pageError.classList.add("hidden");
                goButton.classList.add("hidden");
            } else if (!validatePageName(page).valid) {
                // Show error and hide Go button when invalid
                pageError.textContent = page.length > 100 ? "(Max 100 char)" : "(Invalid)";
                pageError.classList.remove("hidden");
                goButton.classList.add("hidden");
            } else {
                // Valid input: log and show Go button (hide error)
                console.log("toggle!");
                pageError.classList.add("hidden");
                goButton.classList.remove("hidden");
            }
        });
    }

    // Clear link error on input.
    if (linkInput) {
        linkInput.addEventListener("input", () => {
            if (linkError) linkError.style.visibility = "hidden";
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
