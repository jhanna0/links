import { attachFormSubmission } from "/scripts/request.js";
import { validatePageName, validateLink, validateDescription } from "/common/validator.mjs"

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

        attachFormSubmission(form, () => {

            // Ensure link starts with "https://"
            if (!/^https?:\/\//i.test(linkInput.value)) {
                linkInput.value = 'https://' + linkInput.value;
            }

            const link = linkInput.value.trim();
            const description = descriptionInput.value.trim();

            // Validate page name
            const pageValidation = validatePageName(page);
            if (!pageValidation.valid) {
                alert(pageValidation.error);
                return null; // Abort if validation fails
            }

            // Validate link
            const linkValidation = validateLink(link);
            if (!linkValidation.valid) {
                alert(linkValidation.error);
                return null;
            }

            // Validate description
            const descriptionValidation = validateDescription(description);
            if (!descriptionValidation.valid) {
                alert(descriptionValidation.error);
                return null;
            }

            return { page, link, description }; // Only return values if all validations pass
        }, onSuccess, onFailure);
    }

});
