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
    const pillContainer = document.getElementById("pillContainer");

    // Page Navigation & Buttons
    const pageHeadingBack = document.getElementById("pageHeadingBack");
    const shareButton = document.getElementById("copyLinkButton");

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
                alert(linkResult.error)
                return null;
            }
        }

        if (description) {
            const descriptionResult = validateDescription(description);
            if (!descriptionResult.valid) {
                alert("descriptionResult.error")
                return null;
            }
        }

        return { page, link, description };
    }

    function updateTableMessage() {
        let allowed = allowAppending.valid;

        // ✅ Remove any existing placeholder pills before counting
        const existingPlaceholders = pillContainer.querySelectorAll(".pill.placeholder");
        existingPlaceholders.forEach((pill) => pill.remove());

        const pillCount = pillContainer.querySelectorAll(".pill").length;

        if (pillCount === 0) {
            pillContainer.innerHTML = ""; // Clear any existing content

            if (allowed) {
                // ✅ Create a new placeholder pill
                const pill = document.createElement("div");
                pill.classList.add("pill", "placeholder"); // ✅ Add a "placeholder" class

                pill.innerHTML = `
                    <a href="#" class="pill-link">No links yet.</a>
                    <p class="description">Be the first to add a link to this page!</p>
                `;

                pillContainer.appendChild(pill);
            } else {
                // ✅ Show an invalid page pill instead
                const invalidPill = document.createElement("div");
                invalidPill.classList.add("pill", "placeholder");
                invalidPill.innerHTML = `
                    <a href="#" style="color: var(--error-color);" class="pill-link">This page does not exist!</a>
                    <p class="description">Due to invalid page name.</p>
                `;
                pillContainer.appendChild(invalidPill);
            }
        }
    }

    async function updateLinksPillContainer(page) {
        if (!page) return;
        if (!pillContainer) return;

        try {
            // ✅ Select placeholder (if it exists)
            const placeholderPill = pillContainer.querySelector(".pill.placeholder");

            // ✅ Current pill count (excluding placeholder)
            let pillCount = pillContainer.querySelectorAll(".pill").length;
            if (placeholderPill) pillCount -= 1; // Ignore placeholder in count

            // ✅ Fetch new pills
            const newHTML = await fetchUpdatedTable(page, pillCount);
            if (!newHTML || !newHTML.trim()) {
                console.log("No new pills to add.");
                return;
            }

            if (placeholderPill) {
                // ✅ Replace the placeholder pill completely with the new pill(s)
                placeholderPill.outerHTML = newHTML;
            } else {
                // ✅ Just insert new pills normally if no placeholder exists
                pillContainer.insertAdjacentHTML("beforeend", newHTML);
            }

            updateTableMessage(); // ✅ Updates UI state if needed

            // ✅ Smoothly scroll to the last added pill
            setTimeout(() => {
                const lastPill = pillContainer.querySelector(".pill:last-child");
                if (lastPill) {
                    lastPill.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            }, 100);
        } catch (error) {
            console.error("Error updating pill container:", error);
        }
    }

    function onSuccess(formValues, _) {
        if (linkInput) linkInput.value = "";
        if (descriptionInput) descriptionInput.value = "";

        if (formValues.page && window.location.pathname !== `/${formValues.page}`) {
            window.location.href = `/${formValues.page}`;
        } else {
            updateLinksPillContainer(formValues.page);
        }
    }

    function onFailure(errorMessage) {
        alert(errorMessage);
    }

    if (form) {
        attachFormSubmission(form, getFormValues, onSuccess, onFailure);
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
        if (formContainer) {
            formContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            formContainer.classList.add("glow");

            setTimeout(() => {
                formContainer.classList.remove("glow");
            }, 3000);
        }
    });

    linkInput.addEventListener("paste", function (event) {
        event.preventDefault(); // ✅ Prevents the default paste behavior

        let pasteData = (event.clipboardData || window.clipboardData).getData("text");
        this.value = pasteData; // ✅ Inserts the pasted text manually

        setTimeout(() => {
            this.setSelectionRange(0, 0); // ✅ Moves cursor to the start
        }, 0);
    });

    descriptionInput.addEventListener("paste", function (event) {
        event.preventDefault(); // ✅ Prevents the default paste behavior

        let pasteData = (event.clipboardData || window.clipboardData).getData("text");
        this.value = pasteData; // ✅ Inserts the pasted text manually

        setTimeout(() => {
            this.setSelectionRange(0, 0); // ✅ Moves cursor to the start
        }, 0);
    });


});
