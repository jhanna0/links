class AccessModal {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.modal = document.getElementById("accessModal");

        if (!this.modal) {
            console.error("❌ AccessModal not found in DOM.");
            return;
        }

        console.log("✅ AccessModal initialized");

        // Select elements inside the modal
        this.checkoutButton = this.modal.querySelector("#checkoutButton");
        this.closeButton = this.modal.querySelector(".close-button");
        this.apiKeyInput = this.modal.querySelector("#apiKey");
        this.saveButton = this.modal.querySelector("#saveApiKey");

        this.attachEventListeners();

        // Load API key when the modal is initialized
        this.loadApiKey();
    }

    attachEventListeners() {
        if (this.checkoutButton) {
            this.checkoutButton.addEventListener("click", () => this.startCheckout());
        } else {
            console.error("❌ checkoutButton not found.");
        }

        if (this.closeButton) {
            this.closeButton.addEventListener("click", () => this.close());
        } else {
            console.error("❌ closeButton not found.");
        }

        if (this.saveButton) {
            this.saveButton.addEventListener("click", () => this.saveApiKey());
        } else {
            console.error("❌ saveButton not found.");
        }
    }

    // Open the modal and reset input field
    open() {
        if (!this.modal) {
            console.error("❌ Modal does not exist yet.");
            return;
        }
        this.reset();
        this.modal.style.display = "flex";
    }

    // Close and remove the modal from the DOM
    close() {
        if (!this.modal) return;
        this.modal.remove();
    }

    // Reset modal contents
    reset() {
        if (!this.modal) return;
        this.apiKeyInput.value = localStorage.getItem("userApiKey") || "";
    }

    // Load API key from local storage
    loadApiKey() {
        if (!this.apiKeyInput) {
            console.error("❌ API Key input not found.");
            return;
        }

        const storedKey = localStorage.getItem("userApiKey");

        if (storedKey) {
            this.apiKeyInput.value = storedKey;
            console.log("✅ API key loaded from local storage.");
        } else {
            this.apiKeyInput.value = "";
            console.log("ℹ️ No saved API key found.");
        }
    }


    // Save API key to local storage
    saveApiKey() {
        if (!this.apiKeyInput) {
            console.error("❌ API Key input not found.");
            return;
        }
        const key = this.apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem("userApiKey", key);
            alert("✅ API key saved locally.");
        } else {
            localStorage.removeItem("userApiKey");
            alert("❌ API key removed.");
        }
    }

    // Start Stripe checkout process
    async startCheckout() {
        const userConfirmed = await window.confirm(
            "IMPORTANT!! Don't use a fake email during the payment process. Your email is not stored and can be used to verify any issues."
        );

        if (!userConfirmed) return;

        try {
            console.log("Initiating checkout...");

            const response = await fetch("/create-checkout-session", { method: "POST" });
            if (!response.ok) throw new Error("Failed to create checkout session.");

            const { sessionId } = await response.json();

            if (sessionId) {
                console.log("✅ Checkout session created:", sessionId);
                const stripe = Stripe("pk_test_51P09NcH8kt7nJfipp05yxJylJWpThuX0wrWX1cJYjsQFiyEV0Di8n2TitSHD6f5emIVinkyiibnkXAgEEa5BabYG009Pl3NKAG");
                stripe.redirectToCheckout({ sessionId });
            } else {
                console.error("❌ No session ID received.");
                alert("❌ Failed to initiate checkout. Please try again.");
            }
        } catch (error) {
            console.error("Stripe Checkout Error:", error);
            alert("❌ Failed to initiate checkout. Please try again.");
        }
    }
}

// 🔹 Load and open modal, ensuring correct initialization
async function openAccessModal() {
    // Remove existing modal before creating a new one
    const existingModal = document.getElementById("accessModal");
    if (existingModal) existingModal.remove();

    try {
        console.log("Fetching access modal...");
        const response = await fetch("../modals/accessModal.html");
        if (!response.ok) throw new Error("Failed to load modal.");

        const modalHTML = await response.text();
        document.body.insertAdjacentHTML("beforeend", modalHTML);

        // Wait a moment to ensure modal is in the DOM before initializing
        setTimeout(() => {
            new AccessModal().open();
        }, 100);
    } catch (error) {
        console.error("Error loading modal:", error);
        alert("❌ Error loading the access modal.");
    }
}
