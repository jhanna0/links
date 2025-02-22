// Prevent redefinition
if (!window.AccessModal) {
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

            this.checkoutButton = this.modal.querySelector("#checkoutButton");
            this.closeButton = this.modal.querySelector(".close-button");
            this.apiKeyInput = this.modal.querySelector("#apiKey");
            this.saveButton = this.modal.querySelector("#saveApiKey");

            this.attachEventListeners();

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

        open() {
            if (!this.modal) {
                console.error("❌ Modal does not exist.");
                return;
            }
            this.reset();
            this.modal.style.display = "flex";
        }

        close() {
            if (!this.modal) return;
            this.modal.remove();
            accessModalInstance = null;
        }

        reset() {
            if (!this.modal) return;
            this.apiKeyInput.value = "";
        }

        async loadApiKey() {
            if (!this.apiKeyInput) {
                console.error("❌ API Key input not found.");
                return;
            }

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
                    this.deleteCookie("apiKey");
                    this.apiKeyInput.value = "";
                    console.warn("⚠️ API key was invalid or expired. It has been removed.");
                }
            } catch (error) {
                console.error("❌ Error verifying API Key:", error);
            }
        }

        async saveApiKey() {
            const key = this.apiKeyInput.value.trim();

            if (!key) {
                this.deleteCookie("apiKey");
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

        getCookie(name) {
            const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
            return match ? decodeURIComponent(match[2]) : null;
        }

        setCookie(name, value, days) {
            const expires = new Date();
            expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
            document.cookie = `${name}=${encodeURIComponent(value)}; path=/; Secure; SameSite=Strict`;
        }

        deleteCookie(name) {
            document.cookie = `${name}=; Max-Age=0; path=/; Secure; SameSite=Strict`;
        }
    }

    // Assign class to global window object to prevent redeclaration
    window.AccessModal = AccessModal;
}
