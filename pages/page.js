import { fetchUpdatedTable } from "./request.js";
import "/alert.js";

document.addEventListener("DOMContentLoaded", () => {
    const pillContainer = document.getElementById("pillContainer");
    const pageHeadingBack = document.getElementById("pageHeadingBack");
    const shareButton = document.getElementById("copyLinkButton");
    const tooltip = document.getElementById("tooltip");

    function updateTableMessage() {
        const existingPlaceholders = pillContainer.querySelectorAll(".pill.placeholder");
        existingPlaceholders.forEach((pill) => pill.remove());

        const pillCount = pillContainer.querySelectorAll(".pill").length;

        if (pillCount === 0) {
            pillContainer.innerHTML = "";

            const pill = document.createElement("div");
            pill.classList.add("pill", "placeholder");

            pill.innerHTML = `
                <div class="pill-content">
                    <a href="#" class="pill-link">No links yet.</a>
                    <span class="description">Be the first to add a link to this page!</span>
                </div>
            `;

            pillContainer.appendChild(pill);
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
                tooltip.style.visibility = "visible";
                tooltip.style.opacity = "1";

                setTimeout(() => {
                    tooltip.style.opacity = "0";
                    tooltip.style.visibility = "hidden";
                }, 1200);
            } catch (err) {
                console.error("Clipboard copy failed:", err);
            }
        });
    }

    // Expose function for other modules
    window.updateLinksPillContainer = updateLinksPillContainer;
});
