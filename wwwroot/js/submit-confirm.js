(function () {
  document.addEventListener("shell:ready", async () => {
    const params = new URLSearchParams(window.location.search);
    const attemptId = params.get("attemptId");
    if (!attemptId) { window.location.href = "/student/dashboard.html"; return; }

    const stateKey = `attempt_state_${attemptId}`;
    const rawState = sessionStorage.getItem(stateKey);
    if (!rawState) { window.location.href = "/student/dashboard.html"; return; }

    let state;
    try {
      state = JSON.parse(rawState);
    } catch (_) {
      window.location.href = "/student/dashboard.html";
      return;
    }

    const alertBox = document.getElementById("alertBox");
    function showError(msg) {
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Populate titles
    document.getElementById("confirmTestTitle").textContent = `${state.testTitle} · Attempt #${state.attemptNumber}`;

    // Calculate details
    const total = state.questions.length;
    const answered = state.questions.filter(q => q.isAnswered).length;
    const unanswered = total - answered;
    const flagged = state.questions.filter(q => q.isFlagged).length;

    // Display counts
    document.getElementById("sumTotal").textContent = total;
    document.getElementById("sumAnswered").textContent = answered;
    document.getElementById("sumUnanswered").textContent = unanswered;

    // Progress ring — % of questions answered
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    const ring = document.getElementById("progressRing");
    const ringText = document.getElementById("progressRingText");
    if (ring) ring.style.setProperty("--pct", pct);
    if (ringText) ringText.textContent = `${pct}%`;

    // Warnings
    const warnBox = document.getElementById("unansweredWarning");
    if (unanswered > 0) {
      warnBox.classList.remove("d-none");
    }

    const flaggedRow = document.getElementById("flaggedContainer");
    if (flagged > 0 && flaggedRow) {
      flaggedRow.style.setProperty("display", "flex", "important");
      document.getElementById("sumFlagged").textContent = flagged;
    }

    // Back to test redirect — pass attemptId so take-test.js can resume
    const backBtn = document.getElementById("btnBackToTest");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        window.location.href = `/student/take-test.html?testId=${state.testId}&attemptId=${attemptId}`;
      });
    }

    // Render grid status map
    const grid = document.getElementById("statusMapGrid");
    if (grid) {
      grid.innerHTML = state.questions.map((q, idx) => {
        let statusClass = "unanswered";
        let icon = '<i class="bi bi-exclamation-triangle-fill"></i>';

        if (q.isAnswered) {
          statusClass = "answered";
          icon = '<i class="bi bi-check-circle-fill"></i>';
        }
        if (q.isFlagged) {
          statusClass += " flagged";
        }

        return `
          <button type="button" class="status-map-node ${statusClass}" data-q-id="${q.id}" title="Click to scroll to question ${idx + 1}">
            <span class="node-num">${idx + 1}</span>
            <span class="node-icon">${icon}</span>
            <span class="node-flag"><i class="bi bi-flag-fill"></i></span>
          </button>
        `;
      }).join("");

      // Bind node clicks to route back and scroll
      grid.querySelectorAll(".status-map-node").forEach(btn => {
        btn.addEventListener("click", () => {
          const qId = btn.dataset.qId;
          window.location.href = `/student/take-test.html?testId=${state.testId}&attemptId=${attemptId}&scrollTo=${qId}`;
        });
      });
    }

    // Submission execution
    let isSubmitting = false;
    const finalSubmitBtn = document.getElementById("btnFinalSubmit");

    finalSubmitBtn.addEventListener("click", async () => {
      if (isSubmitting) return;
      isSubmitting = true;
      finalSubmitBtn.disabled = true;
      finalSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Submitting attempt...';

      try {
        await Api.post(`/api/attempts/${attemptId}/submit`, { answers: state.answers });
        
        // Clean session state
        sessionStorage.removeItem(stateKey);
        localStorage.removeItem(`flagged_q_${attemptId}`);

        window.location.href = `/student/result.html?attemptId=${attemptId}`;
      } catch (err) {
        isSubmitting = false;
        finalSubmitBtn.disabled = false;
        finalSubmitBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Yes, Submit Attempt';
        showError(err.message || "Failed to submit attempt.");
      }
    });
  });
})();
