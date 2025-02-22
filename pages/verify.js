document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("passwordForm");

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const password = document.getElementById("pagePassword").value;
            if (!password) {
                alert("❌ No password entered.");
                return;
            }

            const pagename = window.location.pathname.replace(/^\//, '');

            try {
                const response = await fetch("/verify-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pagename, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.location.href = data.redirect;
                } else {
                    alert("Invalid Password.");
                }
            } catch (err) {
                console.error("Error verifying password:", err);
                alert("❌ An error occurred while verifying the password.");
            }
        });
    }
});
