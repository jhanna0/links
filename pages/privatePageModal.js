class PrivatePageModal {
    constructor() {
        this.modal = document.getElementById("privatePageModal");
        this.generateButton = document.getElementById("generateButton");
        this.closeButton = this.modal.querySelector(".close-button");

        this.urlElem = document.getElementById("privatePageUrl");
        this.postingPassElem = document.getElementById("postingPassword");
        this.viewingPassElem = document.getElementById("viewingPassword");

        // Bind event listeners using onclick so we can easily swap functionality later
        this.generateButton.onclick = () => this.generatePrivatePage();
        this.closeButton.addEventListener("click", () => this.close());
    }

    // Open the modal & reset data and button state
    open() {
        this.reset();
        this.modal.style.display = "flex";
    }

    // Close the modal
    close() {
        this.modal.style.display = "none";
    }

    // Reset modal contents and button state
    reset() {
        this.urlElem.innerHTML = "...";
        this.postingPassElem.innerText = "...";
        this.viewingPassElem.innerText = "...";
        // Reset button text and bind the generate function
        this.generateButton.innerText = "Generate";
        this.generateButton.disabled = false;
        this.generateButton.onclick = () => this.generatePrivatePage();
    }

    // Generate a new private page from the backend
    async generatePrivatePage() {
        try {
            // Disable the button and show a generating state
            this.generateButton.disabled = true;
            this.generateButton.innerText = "Generating…";

            // Optionally clear previous content
            this.urlElem.innerHTML = "...";
            this.postingPassElem.innerText = "...";
            this.viewingPassElem.innerText = "...";

            // Call backend to create private page
            const response = await fetch("/create-private-page", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || "Failed to generate private page.");
            }

            const pageUrl = `${window.location.origin}/${data.pageName}`;

            // Update the modal with fetched values
            this.urlElem.innerHTML = `<a href="${pageUrl}" style="color: var(--primary-color);" target="_blank" rel="noopener noreferrer">${pageUrl}</a>`;
            this.postingPassElem.innerText = data.postingPassword;
            this.viewingPassElem.innerText = data.viewingPassword;

            // Switch the button to "Copy Data" and bind the copy function
            this.generateButton.innerText = "Copy Data";
            this.generateButton.disabled = false;
            this.generateButton.onclick = () => this.copyPrivatePageInfo();
            setTimeout(() => this.copyPrivatePageInfo(), 50);
        } catch (error) {
            console.error("Error creating private page:", error);
            alert("❌ Error creating private page. Please try again.");
            // Re-enable the button to allow retrying
            this.generateButton.innerText = "Generate";
            this.generateButton.disabled = false;
            this.generateButton.onclick = () => this.generatePrivatePage();
        }
    }

    // Copy the private page info to the clipboard
    copyPrivatePageInfo() {
        const url = this.urlElem.innerText;
        const postPass = this.postingPassElem.innerText;
        const viewPass = this.viewingPassElem.innerText;
        const fullText = `Private URL: ${url}\n Posting Password: ${postPass}\n Viewing Password: ${viewPass}`;

        navigator.clipboard.writeText(fullText).then(() => {
            alert("Page URL and Passwords Copied.");
        });
    }
}

// Attach modal to a global variable
const privatePageModal = new PrivatePageModal();

// Open modal when clicking the "Create Private Page" button
document.getElementById("createPrivatePage").addEventListener("click", () => {
    privatePageModal.open();
});
