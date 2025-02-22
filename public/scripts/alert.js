// Override window.alert with a custom-styled modal
window.alert = function (message) {
    createCustomPopup({ message, type: "alert" });
};

// Override window.confirm with a custom-styled modal
window.confirm = function (message) {
    return new Promise((resolve) => {
        createCustomPopup({ message, type: "confirm", resolve });
    });
};

function createCustomPopup({ message, type, resolve }) {
    let existingPopup = document.getElementById("customPopup");
    let existingOverlay = document.getElementById("customPopupOverlay");

    if (!existingPopup) {
        let overlay = document.createElement("div");
        overlay.id = "customPopupOverlay";
        overlay.classList.add("popup-overlay");
        overlay.onclick = () => closeCustomPopup(false, resolve);
        document.body.appendChild(overlay);

        let popupBox = document.createElement("div");
        popupBox.id = "customPopup";
        popupBox.classList.add("popup-box");
        popupBox.innerHTML = `
            <div class="popup-content">
                <p id="customPopupMessage"></p>
                <div class="popup-buttons">
                    <button id="popupOk" class="popup-btn">OK</button>
                    <button id="popupCancel" class="popup-btn popup-btn-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(popupBox);
        existingPopup = popupBox;
        existingOverlay = overlay;
    }

    document.getElementById("customPopupMessage").textContent = message;
    document.getElementById("popupCancel").style.display = type === "confirm" ? "inline-block" : "none";

    document.getElementById("popupOk").onclick = () => closeCustomPopup(true, resolve);
    document.getElementById("popupCancel").onclick = () => closeCustomPopup(false, resolve);

    existingPopup.style.display = "flex";
    existingOverlay.style.display = "block";

    setTimeout(() => {
        existingPopup.classList.add("visible");
        existingOverlay.classList.add("visible");
    }, 10);
}

function closeCustomPopup(result, resolve) {
    const popupBox = document.getElementById("customPopup");
    const overlay = document.getElementById("customPopupOverlay");

    if (popupBox && overlay) {
        popupBox.classList.remove("visible");
        overlay.classList.remove("visible");

        setTimeout(() => {
            popupBox.style.display = "none";
            overlay.style.display = "none";
            if (resolve) resolve(result);
        }, 300);
    }
}
