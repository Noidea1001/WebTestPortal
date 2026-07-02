(function () {
  document.addEventListener("shell:ready", async () => {
    const alertBox = document.getElementById("alertBox");
    function showError(msg) {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
    }

    try {
      const tests = await Api.get("/api/tests/available");
      const listEl = document.getElementById("testList");
      document.getElementById("emptyTests").classList.toggle("d-none", tests.length > 0);

      listEl.innerHTML = tests.map(t => `
        <div class="col-md-6 col-lg-4">
          <div class="card test-card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h5 class="card-title fw-bold text-dark">${escapeHtml(t.title)}</h5>
              <p class="card-text text-muted small flex-grow-1">${escapeHtml(t.description) || "<em>No description</em>"}</p>
              <p class="small text-muted">${t.questionCount} question(s) &middot; ${t.attemptsUsed}/${t.maxAttempts} attempts used</p>
              <button class="btn btn-brand btn-sm start-btn" data-id="${t.id}" ${t.canAttempt ? "" : "disabled"}>
                ${t.canAttempt ? "Start test" : "No attempts left"}
              </button>
            </div>
          </div>
        </div>
      `).join("");

      listEl.querySelectorAll(".start-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          window.location.href = `/student/take-test.html?testId=${btn.dataset.id}`;
        });
      });
    } catch (err) {
      showError(err.message);
    }
  });
})();
