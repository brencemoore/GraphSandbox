// Notify
// Short Bootstrap toast messages at the top of the page.

const Notify = (() => {

    const DELAY = 5000;


    // Variant is a Bootstrap color name such as "success" or "danger".
    function show(message, variant = "success") {
        const toast = document.createElement("div");
        toast.className = `toast align-items-center text-bg-${variant} border-0`;
        toast.setAttribute("role", "status");

        const row = document.createElement("div");
        row.className = "d-flex";

        const body = document.createElement("div");
        body.className = "toast-body";
        body.textContent = message;

        const close = document.createElement("button");
        close.className = "btn-close btn-close-white me-2 m-auto";
        close.setAttribute("data-bs-dismiss", "toast");
        close.setAttribute("aria-label", "Close");

        row.append(body, close);
        toast.append(row);
        document.getElementById("notifications").append(toast);

        toast.addEventListener("hidden.bs.toast", () => toast.remove());
        bootstrap.Toast.getOrCreateInstance(toast, { delay: DELAY }).show();
    }


    return { show };

})();
