(function () {
  document.addEventListener("shell:ready", async () => {
    const params = new URLSearchParams(window.location.search);
    const testId = params.get("testId");
    const questionId = params.get("id");

    if (!testId || !questionId) {
      window.location.href = "/admin/tests.html";
      return;
    }

    const backUrl = `/admin/edit-test.html?id=${testId}`;
    document.getElementById("backToEditorBtn").href = backUrl;
    document.getElementById("cancelBtn").href = backUrl;

    const alertBox = document.getElementById("alertBox");
    function showError(msg) {
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => alertBox.classList.add("d-none"), 6000);
    }

    function escapeHtml(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // ---- Load test + target question ----
    let test, question;
    try {
      test = await Api.get(`/api/tests/${testId}`);
      document.getElementById("testTitleSubtitle").textContent = `Test: ${test.title}`;
      question = (test.questions || []).find(q => String(q.id) === String(questionId));
      if (!question) {
        showError("This question could not be found. It may have already been deleted.");
        document.getElementById("loadingState").innerHTML =
          '<p class="text-secondary">Question not found.</p>';
        return;
      }
    } catch (err) {
      showError(err.message || "Failed to load question.");
      document.getElementById("loadingState").innerHTML = '<p class="text-secondary">Could not load this question.</p>';
      return;
    }

    document.getElementById("loadingState").classList.add("d-none");
    document.getElementById("formRow").classList.remove("d-none");

    // ---- Options builder ----
    const optionsContainer = document.getElementById("optionsContainer");
    let optionSeq = 0;
    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Keeps each row's (A)(B)(C)… badge in sync with its current position,
    // since rows can be added, removed, or reordered.
    function refreshOptionLetters() {
      optionsContainer.querySelectorAll(".option-edit-row").forEach((row, idx) => {
        const badge = row.querySelector(".opt-row-letter");
        if (badge) badge.textContent = `(${LETTERS[idx] || idx + 1})`;
      });
    }

    function addOptionRow(option) {
      optionSeq++;
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
        updatePreview();
      });
      row.querySelectorAll("input").forEach(input => input.addEventListener("input", updatePreview));
      row.querySelector(".correct-toggle").addEventListener("change", updatePreview);
      optionsContainer.appendChild(row);
      refreshOptionLetters();
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
      updatePreview();
    });

    document.getElementById("addOptionBtn").addEventListener("click", () => { addOptionRow(null); updatePreview(); });
    document.getElementById("qText").addEventListener("input", updatePreview);
    document.getElementById("qWeight").addEventListener("input", updatePreview);

    // Image preview
    document.getElementById("qImageFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const preview = document.getElementById("qImagePreview");
      preview.src = URL.createObjectURL(file);
      preview.classList.remove("d-none");
      updatePreview();
    });

    // ---- Live preview ----
    function updatePreview() {
      const isMultiple = document.getElementById("qType").value === "1";
      document.getElementById("previewTypeBadge").textContent = isMultiple ? "Multiple choice" : "Single choice";
      document.getElementById("previewTypeBadge").className = `q-type-badge ${isMultiple ? "violet" : "brand"}`;
      const weight = document.getElementById("qWeight").value || "1";
      document.getElementById("previewWeightBadge").innerHTML = `<i class="bi bi-star-fill me-1"></i>${weight} pt`;

      const text = document.getElementById("qText").value.trim();
      document.getElementById("previewText").textContent = text || "Question text appears here…";

      const previewImg = document.getElementById("previewImg");
      const qPreview = document.getElementById("qImagePreview");
      if (!qPreview.classList.contains("d-none") && qPreview.src) {
        previewImg.src = qPreview.src;
        previewImg.classList.remove("d-none");
      } else {
        previewImg.classList.add("d-none");
      }

      const rows = [...optionsContainer.querySelectorAll(".option-edit-row")];
      document.getElementById("previewOptions").innerHTML = rows.map((row, idx) => {
        const optText = row.querySelector(".option-text").value.trim() || "Option text…";
        const isCorrect = row.querySelector(".correct-toggle").checked;
        return `
          <div class="q-option-pill ${isCorrect ? 'correct' : ''}">
            <span class="q-option-letter">(${LETTERS[idx] || idx + 1})</span>
            <span class="q-option-indicator">${isCorrect ? '<i class="bi bi-check-lg"></i>' : ''}</span>
            <span class="q-option-text">${escapeHtml(optText)}</span>
          </div>
        `;
      }).join("");
    }

    // ---- Populate form with existing data ----
    document.getElementById("qText").value = question.text || "";
    document.getElementById("qText").classList.add("filled");
    document.getElementById("qType").value = String(question.type);
    document.getElementById("qWeight").value = question.weight;

    if (question.imagePath) {
      const preview = document.getElementById("qImagePreview");
      preview.src = question.imagePath;
      preview.classList.remove("d-none");
    }

    const sortedOptions = (question.options || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
    if (sortedOptions.length) {
      sortedOptions.forEach(o => addOptionRow(o));
    } else {
      addOptionRow(null);
      addOptionRow(null);
    }

    updatePreview();

    // ---- Save (PUT) ----
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

      if (options.some(o => !o.text)) {
        showError("Answer options cannot be empty.");
        return;
      }

      const hasCorrect = options.some(o => o.isCorrect);
      if (!hasCorrect) {
        showError("Please mark at least one option as correct.");
        return;
      }

      const payload = {
        text: document.getElementById("qText").value.trim(),
        type: parseInt(document.getElementById("qType").value, 10),
        weight: parseFloat(document.getElementById("qWeight").value),
        orderIndex: question.orderIndex,
        options
      };

      if (!payload.text) {
        showError("Question text is required.");
        return;
      }

      const saveBtn = document.getElementById("saveBtn");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";

      try {
        const savedQuestion = await Api.put(`/api/tests/${testId}/questions/${questionId}`, payload);

        const file = document.getElementById("qImageFile").files[0];
        if (file) {
          const form = new FormData();
          form.append("file", file);
          await Api.post(`/api/tests/${testId}/questions/${savedQuestion.id}/image`, form);
        }

        WebTestPortalUI.showToast("Question updated successfully.", "success");
        window.location.href = backUrl;
      } catch (err) {
        showError(err.message || "Failed to save question.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Save Changes';
      }
    });

    // ---- Delete ----
    const deleteModalEl = document.getElementById("deleteConfirmModal");
    const deleteModal = new bootstrap.Modal(deleteModalEl);

    document.getElementById("deleteQuestionBtn").addEventListener("click", () => deleteModal.show());

    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
      const btn = document.getElementById("confirmDeleteBtn");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting…';
      try {
        await Api.del(`/api/tests/${testId}/questions/${questionId}`);
        deleteModal.hide();
        WebTestPortalUI.showToast("Question deleted.", "success");
        window.location.href = backUrl;
      } catch (err) {
        deleteModal.hide();
        showError(err.message || "Failed to delete question.");
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
      }
    });
  });
})();
