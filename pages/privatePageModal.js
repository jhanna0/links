class PrivatePageModal {
    constructor() {
        this.modal = document.getElementById("privatePageModal");
        this.generateButton = document.getElementById("generateButton");
        this.closeButton = this.modal.querySelector(".close-button");

        this.urlElem = document.getElementById("privatePageUrl");
        this.postingPassElem = document.getElementById("postingPassword");
        this.viewingPassElem = document.getElementById("viewingPassword");

        // Bind event listeners
        this.generateButton.addEventListener("click", () => this.generatePrivatePage());
        this.closeButton.addEventListener("click", () => this.close());
    }

    // ✅ Open the modal & reset data
    open() {
        this.reset();
        this.modal.style.display = "flex";
    }

    // ✅ Close the modal
    close() {
        this.modal.style.display = "none";
    }

    // ✅ Reset modal contents
    reset() {
        this.urlElem.innerHTML = "...";
        this.postingPassElem.innerText = "...";
        this.viewingPassElem.innerText = "...";
    }

    // ✅ Generate a new private page from the backend
    async generatePrivatePage() {
        try {
            // Show "Generating..." while waiting for response
            this.reset();

            // Call backend to create private page
            const response = await fetch("/create-private-page", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to generate private page.");
            }

            // ✅ Update the modal with fetched values
            this.urlElem.innerHTML = `<a href="${data.pageUrl}" style="color: black;" target="_blank" rel="noopener noreferrer">${data.pageUrl}</a>`;
            this.postingPassElem.innerText = data.postingPassword;
            this.viewingPassElem.innerText = data.viewingPassword;
        } catch (error) {
            console.error("Error creating private page:", error);
            alert("❌ Error creating private page. Please try again.");
        }
    }
}

// ✅ Attach modal to a global variable
const privatePageModal = new PrivatePageModal();

// ✅ Open modal when clicking the "Create Private Page" button
document.getElementById("createPrivatePage").addEventListener("click", () => {
    privatePageModal.open();
});
