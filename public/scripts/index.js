import { validatePageName } from "/common/validator.mjs";
import "/scripts/alert.js";

document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // Element Selections
    // ===============================

    // Home page–specific elements
    const pageNameInput = document.getElementById("page");
    const goButton = document.getElementById("goButton");

    // "Go" button redirects if page name is valid.
    if (goButton && pageNameInput) {
        goButton.addEventListener("click", () => {
            const page = pageNameInput.value.trim();

            if (page) {
                const validation = validatePageName(page);

                if (validation.valid) {
                    window.location.href = `/${page}`;
                } else {
                    alert(validation.error);
                }
            }
        });
    }

    async function loadModal(modalId, modalFile, scriptFiles = []) {
        // Prevent duplicate modals from loading
        if (document.getElementById(modalId)) {
            document.getElementById(modalId).style.display = "flex"; // Show modal if already exists
            return;
        }

        try {
            // Fetch the modal HTML
            const response = await fetch(modalFile);
            if (!response.ok) {
                throw new Error(`Failed to load modal: ${modalFile} (HTTP ${response.status})`);
            }

            const modalHTML = await response.text();
            document.body.insertAdjacentHTML("beforeend", modalHTML);

            // Select the newly inserted modal
            const modal = document.getElementById(modalId);

            // Add close button functionality
            modal.querySelector(".close-button").addEventListener("click", () => {
                modal.remove();
            });

            // Show the modal
            modal.style.display = "flex";

            // Load scripts sequentially and wait for them
            for (let scriptSrc of scriptFiles) {
                await loadScript(scriptSrc);
            }

            // Initialize modal-specific logic AFTER scripts are fully loaded
            initializeModal(modalId);
        } catch (error) {
            console.error("Error loading modal:", error);
            alert("❌ Error loading the modal.");
        }
    }

    // Helper function to load scripts sequentially
    function loadScript(scriptSrc) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = scriptSrc;
            // script.type = "module";  // Keep this if it's a module
            script.onload = () => {
                console.log(`✅ Loaded script: ${scriptSrc}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ Failed to load script: ${scriptSrc}`);
                reject(new Error(`Script load error for ${scriptSrc}`));
            };
            document.body.appendChild(script);
        });
    }


    // Ensure modal logic initializes AFTER scripts load
    function initializeModal(modalId) {
        if (modalId === "accessModal") {
            console.log("✅ Initializing AccessModal after script load.");
            new AccessModal();
        }
    }


    // ===============================
    // Attach Modal Event Listeners
    // ===============================
    document.getElementById("accessButton").addEventListener("click", () => {
        loadModal("accessModal", "./modals/accessModal.html", ["scripts/accessModal.js", "scripts/alert.js", "https://js.stripe.com/v3/"]);
    });

    document.getElementById("infoButton").addEventListener("click", () => {
        loadModal("infoModal", "./modals/infoModal.html");
    });

    document.getElementById("createPrivatePage").addEventListener("click", () => {
        loadModal("privatePageModal", "./modals/privatePageModal.html", ["scripts/privatePageModal.js"]);
    });

    // ===============================
    // Close Modal on Background Click
    // ===============================
    window.addEventListener("click", function (event) {
        if (event.target.classList.contains("modal")) {
            event.target.remove(); // Fully remove modal
        }
    });

    // ===============================
    // Listen for Enter key on the input field
    // ===============================
    pageNameInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent default form submission (if inside a form)
            goButton.click(); // Simulate a click on the Go button
        }
    });
});
