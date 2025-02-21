class AccessModal {
    constructor() {
        this.initialize();
    }

    async initialize() {
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

        // Load and verify API key when initializing
        await this.loadApiKey();
    }

    attachEventListeners() {
        if (this.checkoutButton) {
            this.checkoutButton.addEventListener("click", async () => await this.startCheckout());
        } else {
            console.error("❌ checkoutButton not found.");
        }

        if (this.closeButton) {
            this.closeButton.addEventListener("click", () => this.close());
        } else {
            console.error("❌ closeButton not found.");
        }

        if (this.saveButton) {
            this.saveButton.addEventListener("click", async () => await this.saveApiKey());
        } else {
            console.error("❌ saveButton not found.");
        }
    }

    // Open the modal and reset input field
    open() {
        if (!this.modal) {
            console.error("❌ Modal does not exist.");
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
        this.apiKeyInput.value = "";
    }

    // Load and Verify API Key (from cookies only)
    async loadApiKey() {
        if (!this.apiKeyInput) {
            console.error("❌ API Key input not found.");
            return;
        }

        // Retrieve API key from cookies
        const storedKey = this.getCookie("apiKey");

        if (!storedKey) {
            this.apiKeyInput.value = "";
            console.log("ℹ️ No saved API key found.");
            return;
        }

        try {
            const response = await fetch("/api/verify-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: storedKey }),
            });

            const result = await response.json();

            if (result.success) {
                this.apiKeyInput.value = storedKey;
                console.log("✅ API key is valid.");
            } else {
                this.deleteCookie("apiKey"); // ❌ Remove invalid key
                this.apiKeyInput.value = "";
                console.warn("⚠️ API key was invalid or expired. It has been removed.");
            }
        } catch (error) {
            console.error("❌ Error verifying API Key:", error);
        }
    }

    // Save API Key (Validate Before Storing)
    async saveApiKey() {
        const key = this.apiKeyInput.value.trim();

        if (!key) {
            this.deleteCookie("apiKey"); // Clear cookie
            alert("❌ API key removed.");
            return;
        }

        try {
            const response = await fetch("/api/verify-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: key }),
            });

            const result = await response.json();

            if (result.success) {
                this.setCookie("apiKey", key, 365);
                alert("✅ API key saved.");
            } else {
                alert("❌ Invalid API key.");
            }
        } catch (error) {
            console.error("❌ Error saving API Key:", error);
            alert("❌ Error verifying API Key. Please try again.");
        }
    }

    // Start Stripe checkout process
    async startCheckout() {
        const userConfirmed = await window.confirm(
            "IMPORTANT: Don't use a fake email during the payment process. We don't store your email, but it can be used to verify your purchase."
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

    // 🔹 Utility Functions for Handling Cookies

    // Get cookie value by name
    getCookie(name) {
        const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
        return match ? decodeURIComponent(match[2]) : null;
    }

    // Set cookie with expiration (in days)
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${encodeURIComponent(value)}; path=/; Secure; SameSite=Strict`;
    }

    // Delete cookie by setting max-age to 0
    deleteCookie(name) {
        document.cookie = `${name}=; Max-Age=0; path=/; Secure; SameSite=Strict`;
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
        setTimeout(async () => {
            const modal = new AccessModal();
            await modal.loadApiKey();
            modal.open();
        }, 100);
    } catch (error) {
        console.error("Error loading modal:", error);
        alert("❌ Error loading the access modal.");
    }
}
