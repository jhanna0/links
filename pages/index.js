// homePage.js
import { validatePageName } from "/common/validator.mjs";
import "/alert.js";

document.addEventListener("DOMContentLoaded", () => {
    // ===============================
    // Element Selections
    // ===============================

    // Home page–specific elements
    const pageNameInput = document.getElementById("page");
    const goButton = document.getElementById("goButton");

    // Access toggling elements
    const accessContainer = document.querySelector(".access");
    const accessBtn = document.querySelector(".access-button");

    // API key elements
    const apiKeyInput = document.getElementById("apiKey");
    const saveButton = document.getElementById("saveApiKey");

    // ===============================
    // API Key Functionality
    // ===============================
    // Load saved API key from local storage (if exists)
    const savedKey = localStorage.getItem("userApiKey");
    if (savedKey && apiKeyInput) {
        apiKeyInput.value = savedKey;
    }
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                localStorage.setItem("userApiKey", key);
                alert("API key saved locally.");
            } else {
                localStorage.removeItem("userApiKey"); // Remove stored key if blank
                alert("API key removed.");
            }
        });
    }

    // ===============================
    // Access Container Toggling
    // ===============================
    if (accessBtn && accessContainer) {
        accessBtn.addEventListener("click", () => {
            accessContainer.classList.toggle("hidden");
            if (accessContainer.classList.contains("hidden")) {
                accessBtn.textContent = "Increase access";
            } else {
                accessBtn.textContent = "Decrease access";
            }
        });
    }

    // "Go" button redirects if page name is valid.
    if (goButton && pageNameInput) {
        goButton.addEventListener("click", () => {
            const page = pageNameInput.value.trim();

            if (page) {
                const validation = validatePageName(page)

                if (validation.valid) {
                    window.location.href = `/${page}`;
                }

                else {
                    alert(validation.error);
                }
            }
        });
    }

    document.getElementById('infoButton').addEventListener('click', function () {
        document.getElementById('infoModal').style.display = 'flex';
    });

    document.getElementById('accessButton').addEventListener('click', function () {
        document.getElementById('accessModal').style.display = 'flex';
    });

    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', function () {
            this.parentElement.parentElement.style.display = 'none';
        });
    });

    window.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Listen for Enter key on the input field
    pageNameInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent default form submission (if inside a form)
            goButton.click(); // Simulate a click on the Go button
        }
    });


    // Function to generate a random string
    function generateRandomString(length) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    // Function to copy text to clipboard
    function copyPrivatePageInfo() {
        const url = document.getElementById("privatePageUrl").innerText;
        const postPass = document.getElementById("postingPassword").innerText;
        const viewPass = document.getElementById("viewingPassword").innerText;
        const fullText = `🔒 Private Page Info:\nURL: ${url}\n📩 Posting Password: ${postPass}\n👀 Viewing Password: ${viewPass}`;

        navigator.clipboard.writeText(fullText).then(() => {
            alert("Copied Private Page Info!");
        });
    }

    // Event Listener for "Create Private Page" Button
    document.getElementById("createPrivatePage").addEventListener("click", function () {
        const randomPageId = generateRandomString(8);
        const postingPass = generateRandomString(12);
        const viewingPass = generateRandomString(12);

        // Set the generated values
        document.getElementById("privatePageUrl").innerText = `https://linkstash.co/${randomPageId}`;
        document.getElementById("postingPassword").innerText = postingPass;
        document.getElementById("viewingPassword").innerText = viewingPass;

        // Show the modal
        document.getElementById("privatePageModal").style.display = "flex";
    });

    // Close Modal
    document.querySelectorAll(".close-button").forEach(button => {
        button.addEventListener("click", function () {
            this.closest(".modal").style.display = "none";
        });
    });
});

