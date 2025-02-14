document.addEventListener("DOMContentLoaded", () => {
    // common
    const form = document.querySelector("form"); // Form
    const linkInput = document.getElementById("link"); // Link Input
    const descriptionInput = document.getElementById("description"); // Description Input
    const linkError = document.getElementById("linkError"); // Link Error Span (optional)

    // home page
    const pageNameInput = document.getElementById("page"); // Page Name Input (optional)
    const goButton = document.getElementById("goButton"); // "Go" Button (optional)
    const pageError = document.getElementById("pageError"); // Page Name Error Span (optional)

    // only table page
    const linksTable = document.querySelector("table"); // Table Body for Updates (optional)

    /**
     * ✅ Validate Page Name (Only if Page Name Input Exists)
     */
    // let's require # or char "-" is ugly name
    // max length 100
    function validatePageName() {
        if (!pageNameInput || !goButton) return true; // No page input? Skip validation.

        const pageValue = pageNameInput.value.trim();
        const validPattern = /^[\p{L}\p{N}\+\-\._!~*'()]+$/u;

        if (pageValue == "") {
            pageError.style.display = "none";
            goButton.style.display = "none";
            return false;
        }

        if (pageValue.length > 100) {
            pageError.style.display = "inline";
            pageError.textContent = "(Max 100 char)";
            return false;
        }

        if (!validPattern.test(pageValue)) {
            if (pageError) {
                pageError.style.display = "inline";
                pageError.textContent = "(Invalid)";
            }
            goButton.style.display = "none"; // Hide "Go" button for invalid input
            return false;
        }

        if (pageError) {
            pageError.style.display = "none";
        }
        goButton.style.display = pageValue.length > 0 ? "inline-block" : "none"; // Show "Go" button
        return true;
    }

    /**
     * ✅ Handle "Go" Button Click (Navigates to Page)
     */
    if (goButton && pageNameInput) {
        goButton.addEventListener("click", () => {
            if (validatePageName()) {
                const pageValue = pageNameInput.value.trim();
                window.location.href = `/${pageValue}`;
            }
        });
    }

    /**
     * ✅ Validate Link Input
     */
    // max length 500
    // CHECK THIS ON BACKEND- do we need other validation? english only?
    function validateLink() {
        if (!linkInput) return false;

        let linkValue = linkInput.value.trim();

        // Auto-add "https://" if missing
        if (!/^https?:\/\//i.test(linkValue)) {
            linkValue = "https://" + linkValue;
            linkInput.value = linkValue;
        }

        try {
            const urlObj = new URL(linkValue); // Validate structure

            // any non-http(s) protocols
            if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
                throw new Error("Invalid protocol");
            }

            // localhost, Unicode domains, subdomains, ports, and IPv4/IPv6
            const domainPattern = /^(localhost(:\d{1,5})?|[\p{L}0-9-]+(\.[\p{L}0-9-]+)*(\.[a-zA-Z]{2,})?|(\d{1,3}\.){3}\d{1,3}|\[[a-fA-F0-9:]+\])$/u;

            if (!domainPattern.test(urlObj.hostname)) {
                throw new Error("Invalid domain");
            }

            // out-of-range IPs (0-255 only)
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(urlObj.hostname)) {
                const octets = urlObj.hostname.split('.').map(Number);
                if (octets.some(o => o < 0 || o > 255)) {
                    throw new Error("Invalid IP address");
                }
            }

            if (linkError) {
                linkError.style.display = "none"; // Hide error if valid
            }
            return true;
        } catch (error) {
            if (linkError) {
                linkError.style.display = "inline";
                linkError.textContent = "(Invalid)";
            }
            return false;
        }
    }

    /**
     * ✅ Fetch Updated Links and Update Table (Only If Table Exists)
     */
    async function updateLinksTable(page) {
        if (!linksTable || !page) return;

        try {
            const response = await fetch(`/${page}`);

            if (!response.ok) {
                console.error("Failed to fetch updated page data.");
                return;
            }

            const htmlText = await response.text();

            // Extract new table rows using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");
            const newTableBody = doc.querySelector("table tbody");

            if (newTableBody) {
                linksTable.innerHTML = newTableBody.innerHTML; // Update the table dynamically
                console.log("Table updated successfully!");
            }
        } catch (error) {
            console.error("Error fetching updated links:", error);
        }
    }

    /**
     * ✅ Handle Form Submission
     */
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault(); // Stop default form submission

            const pageValue = pageNameInput ? pageNameInput.value.trim() : "";
            const linkValue = linkInput ? linkInput.value.trim() : "";
            const descriptionValue = descriptionInput ? descriptionInput.value.trim() : "";

            if (pageNameInput && !validatePageName()) return; // Block if page name invalid
            if (linkInput && !validateLink()) return; // Block if link invalid

            if (descriptionValue.length > 100) {
                return
            }

            // **Submit Form via Fetch API**
            const formData = new URLSearchParams();
            formData.append("page", pageValue);
            formData.append("link", linkValue);
            formData.append("description", descriptionValue);

            // this encoding is messing a lot of stuff up
            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: formData.toString(),
                });

                const responseData = await response.json();

                if (response.status === 429) {
                    console.error("Rate limit exceeded:", responseData.error);
                    alert(responseData.error);
                    return; // Exit early
                }

                if (response.ok) {
                    console.log("Submission successful! Clearing form fields...");

                    // Clear form fields
                    if (linkInput) linkInput.value = "";
                    if (descriptionInput) descriptionInput.value = "";
                    if (goButton) goButton.style.display = "none";

                    // If a page name is provided and we aren't on that page, redirect there.
                    if (pageValue && window.location.pathname !== `/${pageValue}`) {
                        if (pageNameInput) pageNameInput.value = "";
                        window.location.href = `/${pageValue}`;
                    } else if (linksTable) {
                        console.log("hi")
                        // Otherwise, if we are on the correct page and the table exists, update it.
                        updateLinksTable(pageValue);
                    }

                } else {
                    console.error("Submission failed:", responseData.error);

                    // **Display Correct Error Message**
                    if (responseData.error.includes("page name") && pageError) {
                        pageError.style.display = "inline";
                        pageError.textContent = responseData.error;
                    } else if (linkError) {
                        linkError.style.display = "inline";
                        linkError.textContent = responseData.error || "Submission failed.";
                    }
                }
            } catch (error) {
                console.error("Error submitting form:", error);
                if (linkError) {
                    linkError.style.display = "inline";
                    linkError.textContent = "Network error. Try again.";
                }
            }
        });
    }

    // **Live Input Events (Only If Elements Exist)**
    if (pageNameInput) pageNameInput.addEventListener("input", validatePageName);
    if (linkInput) linkInput.addEventListener("input", () => {
        if (linkError) linkError.style.display = "none";
    });

    // add description validor max length 100
    // if (descriptionInput) descriptionInput.addEventListener("input", () => {
    //     if (pageError) pageError.style.display = "none";
    // });
});
