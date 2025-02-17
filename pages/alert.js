// Override default alert with a custom-styled modal
window.alert = function (message) {
    let existingAlert = document.getElementById("customAlert");
    let existingBackdrop = document.getElementById("customAlertBackdrop");

    if (!existingAlert) {
        // ✅ Create the backdrop (dimmed background)
        let backdrop = document.createElement("div");
        backdrop.id = "customAlertBackdrop";
        backdrop.classList.add("alert-backdrop");
        backdrop.onclick = closeCustomAlert; // ✅ Clicking background closes the alert
        document.body.appendChild(backdrop);

        // ✅ Create the alert box
        let alertBox = document.createElement("div");
        alertBox.id = "customAlert";
        alertBox.innerHTML = `
            <div class="alert-content">
                <p id="customAlertMessage">${message}</p>
                <button onclick="closeCustomAlert()" class="btn-close-alert">OK</button>
            </div>
        `;
        document.body.appendChild(alertBox);
        existingAlert = alertBox;
        existingBackdrop = backdrop;
    } else {
        document.getElementById("customAlertMessage").textContent = message;
    }

    // ✅ Ensure alert and backdrop are visible
    existingAlert.style.display = "flex";
    existingBackdrop.style.display = "block";

    // ✅ Smooth fade-in effect
    setTimeout(() => {
        existingAlert.classList.add("visible");
        existingBackdrop.classList.add("visible");
    }, 10);
};

// Function to close the custom alert
window.closeCustomAlert = function () {
    const alertBox = document.getElementById("customAlert");
    const backdrop = document.getElementById("customAlertBackdrop");

    if (alertBox && backdrop) {
        alertBox.classList.remove("visible");
        backdrop.classList.remove("visible");

        // ✅ Wait for transition to finish before hiding elements
        setTimeout(() => {
            alertBox.style.display = "none";
            backdrop.style.display = "none";
        }, 300);
    }
};
