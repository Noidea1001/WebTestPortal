// Admin > Tests: list, create, publish/unpublish, delete.
// Runs after layout.js confirms the user is an authenticated Admin.
(function () {
  document.addEventListener("shell:ready", () => {
    const alertBox = document.getElementById("alertBox");
    function showError(err) {
      if (!alertBox) return;
      alertBox.textContent = (err && err.message) || "Something went wrong.";
      alertBox.classList.remove("d-none");
      setTimeout(() => alertBox.classList.add("d-none"), 5000);
    }

    const grid = document.getElementById("testsGrid");
    if (!grid) return;

    let allTests = [];

    function cardHtml(t) {
      const isTimed = !!t.timeLimitMinutes && t.timeLimitMinutes > 0;
      return `
        <div class="col-md-6 col-lg-4 test-filter-row" data-title="${escapeHtml(t.title.toLowerCase())}" data-status="${t.isPublished ? "published" : "draft"}">
          <div class="admin-test-card ${t.isPublished ? "is-published" : "is-draft"}">
            <div class="admin-card-top">
              <div class="admin-card-title">${escapeHtml(t.title)}</div>
              ${t.isPublished
                ? '<span class="admin-status-badge published"><i class="bi bi-broadcast"></i> Live</span>'
                : '<span class="admin-status-badge draft"><i class="bi bi-pencil"></i> Draft</span>'}
            </div>
            <p class="admin-card-desc">${escapeHtml(t.description) || "No description provided."}</p>
            <div class="admin-card-meta-row">
              <span class="badge text-bg-light border"><i class="bi bi-question-circle me-1"></i>${t.questionCount} question(s)</span>
              <span class="badge text-bg-light border"><i class="bi bi-trophy me-1"></i>${t.maxAttempts} attempt(s)</span>
              <span class="badge text-bg-light border"><i class="bi ${isTimed ? "bi-stopwatch" : "bi-infinity"} me-1"></i>${isTimed ? `${t.timeLimitMinutes} min` : "Unlimited"}</span>
            </div>
            <div class="d-flex gap-2 mt-auto">
              <a href="/admin/edit-test.html?id=${t.id}" class="btn btn-sm btn-outline-brand flex-grow-1"><i class="bi bi-pencil-square"></i> Edit</a>
              <button type="button" class="btn btn-sm ${t.isPublished ? "btn-outline-warning" : "btn-outline-success"} w-100 publish-btn" data-id="${t.id}" data-publish="${!t.isPublished}">
                <i class="bi ${t.isPublished ? "bi-eye-slash" : "bi-broadcast"}"></i> ${t.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-id="${t.id}" data-title="${escapeHtml(t.title)}" title="Delete test"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>`;
    }

    function render() {
      grid.innerHTML = allTests.map(cardHtml).join("");
      document.getElementById("testsCount").textContent = `${allTests.length} test(s)`;
      document.getElementById("publishedCount").textContent = allTests.filter(t => t.isPublished).length;
      document.getElementById("draftCount").textContent = allTests.filter(t => !t.isPublished).length;
      document.getElementById("emptyTestsState").classList.toggle("d-none", allTests.length > 0);
      document.getElementById("testsToolbar").classList.toggle("d-none", allTests.length === 0);

      grid.querySelectorAll(".publish-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          WebTestPortalUI.setButtonLoading(btn, true);
          try {
            await Api.post(`/api/tests/${btn.dataset.id}/publish?published=${btn.dataset.publish}`);
            await loadTests();
          } catch (err) {
            showError(err);
            WebTestPortalUI.setButtonLoading(btn, false);
          }
        });
      });

      grid.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => openDeleteModal(btn.dataset.id, btn.dataset.title));
      });
    }

    // ---------------- Delete test modal (mirrors the Delete Question modal) ----------------
    const deleteModalEl = document.getElementById("deleteTestModal");
    const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;
    let pendingDeleteId = null;

    function openDeleteModal(testId, title) {
      pendingDeleteId = testId;
      document.getElementById("deleteTestTitle").textContent = title || "this test";
      deleteModal?.show();
    }

    document.getElementById("confirmDeleteTestBtn")?.addEventListener("click", async () => {
      if (!pendingDeleteId) return;
      const btn = document.getElementById("confirmDeleteTestBtn");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting…';
      try {
        await Api.del(`/api/tests/${pendingDeleteId}`);
        deleteModal?.hide();
        WebTestPortalUI.showToast("Test deleted.", "success");
        await loadTests();
      } catch (err) {
        deleteModal?.hide();
        showError(err);
      } finally {
        pendingDeleteId = null;
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
      }
    });

    async function loadTests() {
      try {
        allTests = await Api.get("/api/tests");
        render();
      } catch (err) {
        showError(err);
      }
    }

    // Search + status filter
    document.getElementById("testsSearch")?.addEventListener("input", filterRows);
    document.getElementById("testsStatusFilter")?.addEventListener("change", filterRows);
    function filterRows() {
      const query = (document.getElementById("testsSearch")?.value || "").trim().toLowerCase();
      const status = document.getElementById("testsStatusFilter")?.value || "";
      let visible = 0;
      grid.querySelectorAll(".test-filter-row").forEach(row => {
        const show = (!query || row.dataset.title.includes(query)) && (!status || row.dataset.status === status);
        row.classList.toggle("d-none", !show);
        if (show) visible++;
      });
      document.getElementById("noTestResults").style.display = visible === 0 ? "flex" : "none";
    }

    loadTests();
  });
})();
