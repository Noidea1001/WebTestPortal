// Shared shell logic for every protected (logged-in) page.
// Replaces the role-based sidebar rendering that used to live in
// Views/Shared/_Layout.cshtml. Each protected page includes a static
// sidebar with BOTH Admin and Student nav blocks already in the markup
// (data-role="Admin" / data-role="Student"); this script shows the right
// one, highlights the active link, fills in the user's name/initial, and
// wires up logout + the mobile sidebar toggle.
(function () {
  async function initShell() {
    let me;
    try {
      me = await Api.get("/api/auth/me");
    } catch {
      window.location.href = "/login.html";
      return;
    }

    document.querySelectorAll("[data-role]").forEach((el) => {
      el.style.display = el.dataset.role === me.role ? "" : "none";
    });

    const activePage = document.body.dataset.activePage;
    if (activePage) {
      document.querySelectorAll(`.sidebar-nav a[data-page]`).forEach((a) => {
        a.classList.toggle("active", a.dataset.page === activePage);
      });
    }

    document.querySelectorAll(".js-user-name").forEach((el) => { el.textContent = me.fullName || me.username; });
    document.querySelectorAll(".js-user-role").forEach((el) => {
      el.innerHTML = me.role === "Admin"
        ? '<span class="text-brand">Administrator</span>'
        : '<span class="text-emerald-500">Student</span>';
    });
    const initial = (me.fullName || me.username || "U").trim()[0].toUpperCase();
    document.querySelectorAll(".js-user-avatar").forEach((el) => { el.textContent = initial; });

    // Admins can view student pages for testing; students can't see admin pages.
    if (document.body.dataset.requireRole === "Admin" && me.role !== "Admin") {
      window.location.href = "/student/dashboard.html";
      return;
    }

    document.querySelectorAll(".js-logout-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        try { await Api.post("/api/auth/logout"); } catch { /* ignore */ }
        window.location.href = "/login.html";
      });
    });

    window.WebTestPortalMe = me;
    document.dispatchEvent(new CustomEvent("shell:ready", { detail: me }));
  }

  initShell();
})();
