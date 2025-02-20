import { attachFormSubmission } from "./request.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form");
    const linkInput = document.getElementById("linkPage");
    const descriptionInput = document.getElementById("descriptionPage");

    function onSuccess(formValues, _) {
        if (linkInput) linkInput.value = "";
        if (descriptionInput) descriptionInput.value = "";

        if (formValues.page && window.location.pathname !== `/${formValues.page}`) {
            window.location.href = `/${formValues.page}`;
        } else {
            window.updateLinksPillContainer(formValues.page); // ✅ Ensure links update dynamically
        }
    }

    function onFailure(errorMessage) {
        alert(errorMessage);
    }

    if (form) {
        const page = window.location.pathname.substring(1); // Extract pagename from URL
        attachFormSubmission(form, () => ({
            page: page.trim(),
            link: linkInput.value.trim(),
            description: descriptionInput.value.trim(),
        }), onSuccess, onFailure);
    }
});
