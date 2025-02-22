if (!window.PrivatePageModal) {
    class PrivatePageModal {
        constructor() {
            this.initialize();
        }

        async initialize() {
            this.modal = document.getElementById("privatePageModal");

            if (!this.modal) {
                console.error("❌ PrivatePageModal not found in DOM.");
                return;
            }

            this.generateButton = this.modal.querySelector("#generateButton");
            this.closeButton = this.modal.querySelector(".close-button");

            this.urlElem = this.modal.querySelector("#privatePageUrl");
            this.postingPassElem = this.modal.querySelector("#postingPassword");
            this.viewingPassElem = this.modal.querySelector("#viewingPassword");

            this.attachEventListeners();
        }

        attachEventListeners() {
            if (this.generateButton) {
                this.generateButton.addEventListener("click", () => this.generatePrivatePage());
            } else {
                console.error("❌ generateButton not found.");
            }

            if (this.closeButton) {
                this.closeButton.addEventListener("click", () => this.close());
            } else {
                console.error("❌ closeButton not found.");
            }
        }

        // Open the modal & reset data
        open() {
            if (!this.modal) return;
            this.reset();
            this.modal.style.display = "flex";
        }

        // Close the modal
        close() {
            if (!this.modal) return;
            this.modal.style.display = "none";
        }

        // Reset modal contents
        reset() {
            if (!this.modal) return;
            this.urlElem.innerHTML = "...";
            this.postingPassElem.innerText = "...";
            this.viewingPassElem.innerText = "...";
            this.generateButton.innerText = "Generate";
            this.generateButton.disabled = false;
        }

        // Generate a new private page from the backend
        async generatePrivatePage() {
            if (!this.generateButton) return;

            try {
                this.generateButton.disabled = true;
                this.generateButton.innerText = "Generating…";

                const response = await fetch("/create-private-page", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                });
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || "Failed to generate private page.");
                }

                const pageUrl = `${window.location.origin}/${data.pageName}`;
                this.urlElem.innerHTML = `<a href="${pageUrl}" style="color: var(--primary-color);" target="_blank">${pageUrl}</a>`;
                this.postingPassElem.innerText = data.postingPassword;
                this.viewingPassElem.innerText = data.viewingPassword;

                this.generateButton.innerText = "Copy Data";
                this.generateButton.disabled = false;
                this.generateButton.onclick = () => this.copyPrivatePageInfo();
                this.copyPrivatePageInfo();
            } catch (error) {
                console.error("❌ Error creating private page:", error);
                alert("❌ Error creating private page. Please try again.");
                this.generateButton.innerText = "Generate";
                this.generateButton.disabled = false;
            }
        }

        // Copy the private page info to the clipboard
        copyPrivatePageInfo() {
            const url = this.urlElem.innerText;
            const postPass = this.postingPassElem.innerText;
            const viewPass = this.viewingPassElem.innerText;
            const fullText = `Private URL: ${url} Viewing Password: ${viewPass} Posting Password: ${postPass}`;

            navigator.clipboard.writeText(fullText).then(() => {
                alert("Page URL and Passwords Copied.");
            });
        }
    }

    // Assign class to global window object to prevent redeclaration
    window.PrivatePageModal = new PrivatePageModal();
}
