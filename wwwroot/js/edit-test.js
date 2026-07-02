(function () {
  document.addEventListener("shell:ready", async () => {
  const testId = new URLSearchParams(window.location.search).get("id");
  if (!testId) { window.location.href = "/admin/tests.html"; return; }

  const alertBox = document.getElementById("alertBox");
  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
    setTimeout(() => alertBox.classList.add("d-none"), 4500);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------------- Test metadata ----------------
  async function loadTest() {
    const test = await Api.get(`/api/tests/${testId}`);
    document.getElementById("metaTitle").value = test.title;
    document.getElementById("metaDescription").value = test.description;
    document.getElementById("metaMaxAttempts").value = test.maxAttempts;
    document.getElementById("metaTimeLimit").value = test.timeLimitMinutes ?? "";
    document.getElementById("metaShuffleQuestions").checked = test.shuffleQuestions;
    document.getElementById("metaShuffleOptions").checked = test.shuffleOptions;
    document.getElementById("statusBadge").innerHTML = test.isPublished
      ? '<span class="badge bg-success">Published</span>'
      : '<span class="badge bg-secondary">Draft</span>';
    document.getElementById("statusQuestionCount").textContent = test.questions.length;
    renderQuestions(test.questions);
    return test;
  }

  document.getElementById("testMetaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const timeLimitRaw = document.getElementById("metaTimeLimit").value;
      await Api.put(`/api/tests/${testId}`, {
        title: document.getElementById("metaTitle").value.trim(),
        description: document.getElementById("metaDescription").value.trim(),
        maxAttempts: parseInt(document.getElementById("metaMaxAttempts").value, 10),
        timeLimitMinutes: timeLimitRaw ? parseInt(timeLimitRaw, 10) : null,
        shuffleQuestions: document.getElementById("metaShuffleQuestions").checked,
        shuffleOptions: document.getElementById("metaShuffleOptions").checked
      });
      const msg = document.getElementById("metaSavedMsg");
      msg.classList.remove("d-none");
      setTimeout(() => msg.classList.add("d-none"), 2000);
      if (window.WebTestPortalUI) WebTestPortalUI.showToast("Test details saved.", "success");
    } catch (err) {
      showError(err.message);
    }
  });

  // ---------------- Question list rendering ----------------
  function renderQuestions(questions) {
    const listEl = document.getElementById("questionList");
    const noneEl = document.getElementById("noQuestions");
    noneEl.classList.toggle("d-none", questions.length > 0);

    const sorted = questions.slice().sort((a, b) => a.orderIndex - b.orderIndex);

    listEl.innerHTML = sorted.map((q, idx) => {
      const typeLabel = q.type === 0 ? "Single choice" : "Multiple choice";
      const typeClass = q.type === 0 ? "brand" : "violet";
      const correctCount = q.options.filter(o => o.isCorrect).length;
      const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const optionPills = q.options
        .slice().sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o, optIdx) => `
          <div class="q-option-pill ${o.isCorrect ? 'correct' : ''}">
            <span class="q-option-letter">(${LETTERS[optIdx] || optIdx + 1})</span>
            <span class="q-option-indicator">${o.isCorrect ? '<i class="bi bi-check-lg"></i>' : ''}</span>
            <span class="q-option-text">${escapeHtml(o.text)}</span>
          </div>
        `).join("");

      return `
        <div class="question-card" data-id="${q.id}">
          <div class="question-card-header">
            <div class="d-flex align-items-center gap-2">
              <span class="q-number">(Q${idx + 1})</span>
              <span class="q-type-badge ${typeClass}">${typeLabel}</span>
              <span class="q-weight-badge"><i class="bi bi-star-fill me-1"></i>${q.weight} pt</span>
            </div>
            <div class="d-flex gap-2">
              <a class="btn btn-sm btn-outline-secondary edit-q-btn" href="/admin/edit-question.html?testId=${testId}&id=${q.id}">
                <i class="bi bi-pencil me-1"></i>Edit
              </a>
              <button type="button" class="btn btn-sm btn-outline-danger del-q-btn" data-id="${q.id}">
                <i class="bi bi-trash me-1"></i>Delete
              </button>
            </div>
          </div>
          <div class="question-card-body">
            <p class="q-text">${escapeHtml(q.text)}</p>
            ${q.imagePath ? `<img src="${q.imagePath}" class="question-image mb-2">` : ""}
            <div class="q-options-grid">${optionPills}</div>
            <div class="q-meta-row">
              <span class="q-correct-count">
                <i class="bi bi-check-circle-fill text-emerald-500 me-1"></i>${correctCount} correct answer${correctCount !== 1 ? "s" : ""}
              </span>
              <span class="q-options-count text-secondary" style="font-size:0.78rem;">${q.options.length} options</span>
            </div>
            <div class="q-timestamp-row">
              <i class="bi bi-clock-history me-1"></i>${formatTimestamp(q)}
            </div>
          </div>
        </div>
      `;
    }).join("");

    listEl.querySelectorAll(".del-q-btn").forEach(btn => {
      btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
    });
  }

  // Formats a question's created/updated timestamp using the viewer's own browser locale
  // and timezone (Intl-backed), never a hardcoded UTC string.
  function formatTimestamp(q) {
    const edited = q.updatedAt ? new Date(q.updatedAt) : null;
    const created = q.createdAt ? new Date(q.createdAt) : null;
    const fmt = (d) => d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    if (edited && created && edited.getTime() !== created.getTime()) {
      return `Edited ${fmt(edited)}`;
    }
    if (created) return `Created ${fmt(created)}`;
    return "";
  }

  // ---------------- Delete question modal ----------------
  const deleteModalEl = document.getElementById("deleteQuestionModal");
  const deleteModal = new bootstrap.Modal(deleteModalEl);
  let pendingDeleteId = null;

  function openDeleteModal(questionId) {
    pendingDeleteId = questionId;
    deleteModal.show();
  }

  document.getElementById("confirmDeleteQuestionBtn").addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    const btn = document.getElementById("confirmDeleteQuestionBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting…';
    try {
      await Api.del(`/api/tests/${testId}/questions/${pendingDeleteId}`);
      deleteModal.hide();
      if (window.WebTestPortalUI) WebTestPortalUI.showToast("Question deleted.", "success");
      await loadTest();
    } catch (err) {
      deleteModal.hide();
      showError(err.message);
    } finally {
      pendingDeleteId = null;
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
    }
  });

  document.getElementById("addQuestionBtn").addEventListener("click", () => {
    window.location.href = `/admin/add-question.html?id=${testId}`;
  });

  await loadTest();
  });
})();
