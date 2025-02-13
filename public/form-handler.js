document.addEventListener("DOMContentLoaded", () => {
    const pageNameInput = document.getElementById("page");
    const goButton = document.getElementById("goButton");
    const linkInput = document.getElementById("link") || document.querySelector('input[name="link"]');
    const descriptionInput = document.getElementById("description") || document.querySelector('textarea[name="description"]');
    const linkError = document.getElementById("linkError"); // Error message span
    const form = document.querySelector("form");

    if (!form || !linkInput || !descriptionInput) {
        console.warn("Form or input fields not found on this page, skipping script execution.");
        return;
    }

    pageNameInput.addEventListener("input", () => {
        if (pageNameInput.value.trim().length > 0) {
            goButton.style.display = "inline-block";
        } else {
            goButton.style.display = "none";
        }
    });

    // **Live URL Validation (Show Error When Typing)**
    linkInput.addEventListener("input", () => {
        linkError.style.display = "none";
        // let linkValue = linkInput.value.trim();

        // // Auto-add "https://" if missing (but only show error on invalid input)
        // if (linkValue && !/^https?:\/\//i.test(linkValue)) {
        //     linkValue = "https://" + linkValue;
        // }

        // try {
        //     const urlObj = new URL(linkValue); // Validate the URL structure

        //     // **Strict domain validation**
        //     const domainPattern = /^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
        //     if (!domainPattern.test(urlObj.hostname)) {
        //         throw new Error("Invalid domain");
        //     }

        //     // ✅ If valid, hide the error message
        //     linkError.style.display = "none";
        //     linkError.textContent = "";
        // } catch (error) {
        //     // ❌ Show red error message
        //     linkError.style.display = "inline";
        //     linkError.textContent = " (Link is invalid)";
        // }
    });

    // **Final URL Validation Before Submitting**
    form.addEventListener("submit", async (event) => {
        event.preventDefault(); // Stop default form submission

        let linkValue = linkInput.value.trim();

        // **Auto-add "https://" BEFORE browser validation**
        if (!/^https?:\/\//i.test(linkValue)) {
            linkValue = "https://" + linkValue;
            linkInput.value = linkValue; // Set the corrected value before validation
        }

        try {
            const urlObj = new URL(linkValue); // Validate the URL structure

            // **Strict domain validation**
            const domainPattern = /^(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
            if (!domainPattern.test(urlObj.hostname)) {
                throw new Error("Invalid domain");
            }

            // ✅ Hide error message if valid
            linkError.style.display = "none";
            linkError.textContent = "";

            console.log("Submitting with valid URL:", linkInput.value);

            // **Submit Form via Fetch API**
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams(formData).toString(),
            });

            if (response.ok) {
                console.log("Submission successful! Clearing form fields...");

                // Clear form fields
                linkInput.value = "";
                descriptionInput.value = "";
                if (pageNameInput) pageNameInput.value = "";

                // Redirect to `/pagename`
                const pageName = formData.get("page");
                if (pageName) {
                    window.location.href = `/${pageName}`;
                }
            } else {
                console.error("Submission failed:", await response.text());
                alert("Failed to submit the form.");
            }
        } catch (error) {
            // ❌ Show red error message instead of alert
            linkError.style.display = "inline";
            linkError.textContent = "(Invalid)";
        }
    });
});
