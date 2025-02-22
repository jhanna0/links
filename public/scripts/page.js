import { fetchUpdatedTable } from "/scripts/request.js";
import "/scripts/alert.js";

document.addEventListener("DOMContentLoaded", () => {
    const pillContainer = document.getElementById("pillContainer");
    const pageHeadingBack = document.getElementById("pageHeadingBack");
    const shareButton = document.getElementById("copyLinkButton");
    const toggleFormButton = document.getElementById("toggleFormButton");
    const formContainer = document.getElementById("formContainer");
    const linkModal = document.getElementById("linkModal");
    const modalLinkText = document.getElementById("modalLinkText");
    const closeButton = document.querySelector(".close-button");

    function updateTableMessage() {
        const existingPlaceholders = pillContainer.querySelectorAll(".pill.placeholder");
        existingPlaceholders.forEach(pill => pill.remove());

        const pillCount = pillContainer.querySelectorAll(".pill").length;

        if (pillCount === 0) {
            pillContainer.innerHTML = `
                <div class="pill placeholder">
                    <div class="pill-content">
                        <a href="#" class="pill-link">No links yet.</a>
                        <span class="description">Be the first to add a link to this page!</span>
                    </div>
                </div>
            `;
        }
    }

    async function updateLinksPillContainer(page) {
        if (!page || !pillContainer) return;

        try {
            const placeholderPill = pillContainer.querySelector(".pill.placeholder");
            let pillCount = pillContainer.querySelectorAll(".pill").length;
            if (placeholderPill) pillCount -= 1;

            const newHTML = await fetchUpdatedTable(page, pillCount);
            if (!newHTML || !newHTML.trim()) return;

            if (placeholderPill) {
                placeholderPill.outerHTML = newHTML;
            } else {
                pillContainer.insertAdjacentHTML("beforeend", newHTML);
            }

            updateTableMessage();
        } catch (error) {
            console.error("Error updating pill container:", error);
        }
    }

    updateTableMessage();

    if (pageHeadingBack) {
        pageHeadingBack.addEventListener("click", () => {
            document.referrer.endsWith("/") ? window.history.back() : (window.location.href = "/");
        });
        pageHeadingBack.style.cursor = "pointer";
    }

    if (shareButton) {
        shareButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
            } catch (err) {
                console.error("Clipboard copy failed:", err);
            }
        });
    }

    // Smooth scroll and glow effect when toggleFormButton is clicked
    if (toggleFormButton && formContainer) {
        toggleFormButton.addEventListener("click", () => {
            formContainer.scrollIntoView({ behavior: "smooth", block: "center" });
            formContainer.classList.remove("glow");
            setTimeout(() => formContainer.classList.add("glow"), 100);
        });
    }

    // Open Modal When Clicking "⋮" (three-dot menu)
    pillContainer.addEventListener("click", (event) => {
        const icon = event.target.closest(".pill-link-icon");
        if (!icon) return;

        const link = icon.getAttribute("data-link");
        if (!link) return;

        modalLinkText.textContent = link;
        linkModal.style.display = "flex";
    });

    // Close Modal When Clicking "X" or Outside
    closeButton?.addEventListener("click", () => (linkModal.style.display = "none"));

    window.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal")) {
            event.target.style.display = "none";
        }
    });

    // Copy Link Functionality
    function copyToClipboard() {
        const linkText = modalLinkText.textContent;
        navigator.clipboard.writeText(linkText).then(() => {
            alert("Link copied.");
        }).catch(err => {
            console.error("Error copying text:", err);
            alert("Failed to copy.");
        });
    }

    window.copyToClipboard = copyToClipboard; // Expose globally

    // Expose function for other modules
    window.updateLinksPillContainer = updateLinksPillContainer;
});
