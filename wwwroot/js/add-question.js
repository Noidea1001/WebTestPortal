(function () {
  document.addEventListener("shell:ready", async () => {
    const params = new URLSearchParams(window.location.search);
    const testId = params.get("id");
    if (!testId) { window.location.href = "/admin/tests.html"; return; }

    const backUrl = `/admin/edit-test.html?id=${testId}`;
    document.getElementById("backToEditorBtn").href = backUrl;
    document.getElementById("doneBtn").href = backUrl;

    const alertBox = document.getElementById("alertBox");
    function showError(msg) {
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
      setTimeout(() => alertBox.classList.add("d-none"), 5000);
    }

    // Load test title
    try {
      const test = await Api.get(`/api/tests/${testId}`);
      document.getElementById("testTitleSubtitle").textContent = `Test: ${test.title}`;
    } catch (_) {
      document.getElementById("testTitleSubtitle").textContent = "";
    }

    // ---- Options builder ----
    const optionsContainer = document.getElementById("optionsContainer");
    let optionSeq = 0;
    let sessionCount = 0;
    let sessionQuestions = [];
    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Keeps each row's (A)(B)(C)… badge in sync with its current position,
    // since rows can be added or removed.
    function refreshOptionLetters() {
      optionsContainer.querySelectorAll(".option-edit-row").forEach((row, idx) => {
        const badge = row.querySelector(".opt-row-letter");
        if (badge) badge.textContent = `(${LETTERS[idx] || idx + 1})`;
      });
    }

    function addOptionRow(option) {
      const rowId = `opt_${optionSeq++}`;
      const isMultiple = document.getElementById("qType").value === "1";
      const row = document.createElement("div");
      row.className = "input-group option-edit-row";
      row.dataset.optionId = option && option.id ? option.id : "";
      row.innerHTML = `
        <span class="input-group-text opt-row-letter" style="background:var(--slate-50);font-weight:700;color:var(--slate-500);min-width:2.6rem;justify-content:center;"></span>
        <span class="input-group-text" style="background:var(--slate-50);">
          <input type="${isMultiple ? 'checkbox' : 'radio'}" name="correctOption" class="correct-toggle" ${option && option.isCorrect ? "checked" : ""}>
        </span>
        <input type="text" class="form-control option-text" value="${option ? escapeHtml(option.text) : ""}" placeholder="Option text" required>
        <button type="button" class="btn btn-outline-danger remove-option-btn" tabindex="-1">&times;</button>
      `;
      row.querySelector(".remove-option-btn").addEventListener("click", () => {
        row.remove();
        refreshOptionLetters();
      });
      optionsContainer.appendChild(row);
      refreshOptionLetters();
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    document.getElementById("qType").addEventListener("change", () => {
      const isMultiple = document.getElementById("qType").value === "1";
      optionsContainer.querySelectorAll(".option-edit-row").forEach(row => {
        const toggle = row.querySelector(".correct-toggle");
        const wasChecked = toggle.checked;
        toggle.type = isMultiple ? "checkbox" : "radio";
        toggle.name = "correctOption";
        toggle.checked = wasChecked;
      });
    });

    document.getElementById("addOptionBtn").addEventListener("click", () => addOptionRow(null));

    // Image preview
    document.getElementById("qImageFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const preview = document.getElementById("qImagePreview");
      preview.src = URL.createObjectURL(file);
      preview.classList.remove("d-none");
    });

    // Reset form for next question
    function resetForm() {
      document.getElementById("questionForm").reset();
      optionsContainer.innerHTML = "";
      document.getElementById("qImagePreview").classList.add("d-none");
      document.getElementById("qImagePreview").src = "";
      addOptionRow(null);
      addOptionRow(null);
      document.getElementById("qText").focus();
    }

    // Render session sidebar list
    function renderSessionList() {
      const listEl = document.getElementById("sessionList");
      const emptyEl = document.getElementById("sessionEmpty");
      const badge = document.getElementById("addedCountBadge");
      document.getElementById("addedCount").textContent = sessionCount;

      if (sessionQuestions.length === 0) {
        emptyEl.style.display = "";
        listEl.innerHTML = "";
        badge.style.display = "none";
        return;
      }

      emptyEl.style.display = "none";
      badge.style.display = "flex";

      listEl.innerHTML = sessionQuestions.map((q, i) => `
        <div class="session-q-item">
          <div class="d-flex align-items-start gap-2">
            <span class="session-q-num">${i + 1}</span>
            <div class="flex-grow-1 min-w-0">
              <div class="session-q-text">${escapeHtml(q.text)}</div>
              <div class="d-flex gap-1 mt-1 flex-wrap">
                <span class="session-q-badge">${q.type === 0 ? "Single" : "Multiple"}</span>
                <span class="session-q-badge">${q.weight} pt</span>
                <span class="session-q-badge emerald">${q.options.filter(o => o.isCorrect).length} correct</span>
              </div>
            </div>
          </div>
        </div>
      `).join("");
    }

    // Init
    addOptionRow(null);
    addOptionRow(null);
    renderSessionList();

    // ---- Form submit ----
    document.getElementById("questionForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const rows = [...optionsContainer.querySelectorAll(".option-edit-row")];
      if (rows.length < 2) {
        showError("A question needs at least two answer options.");
        return;
      }

      const options = rows.map((row, idx) => ({
        id: row.dataset.optionId ? parseInt(row.dataset.optionId, 10) : null,
        text: row.querySelector(".option-text").value.trim(),
        isCorrect: row.querySelector(".correct-toggle").checked,
        orderIndex: idx
      }));

      const hasCorrect = options.some(o => o.isCorrect);
      if (!hasCorrect) {
        showError("Please mark at least one option as correct.");
        return;
      }

      const payload = {
        text: document.getElementById("qText").value.trim(),
        type: parseInt(document.getElementById("qType").value, 10),
        weight: parseFloat(document.getElementById("qWeight").value),
        orderIndex: sessionCount,
        options
      };

      const saveBtn = document.getElementById("saveBtn");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";

      try {
        const savedQuestion = await Api.post(`/api/tests/${testId}/questions`, payload);

        const file = document.getElementById("qImageFile").files[0];
        if (file) {
          const form = new FormData();
          form.append("file", file);
          await Api.post(`/api/tests/${testId}/questions/${savedQuestion.id}/image`, form);
        }

        sessionCount++;
        sessionQuestions.push({ ...payload, id: savedQuestion.id });
        renderSessionList();

        // Show success flash
        const flash = document.getElementById("successFlash");
        flash.classList.remove("d-none");
        flash.classList.add("d-flex");
        setTimeout(() => {
          flash.classList.add("d-none");
          flash.classList.remove("d-flex");
        }, 3000);

        resetForm();
      } catch (err) {
        showError(err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Save &amp; Add Another';
      }
    });
  });
})();
