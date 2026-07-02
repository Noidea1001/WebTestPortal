(function () {
  document.addEventListener("shell:ready", async (evt) => {

    // ── Auth ─────────────────────────────────────────────────────
    const me = evt.detail || window.WebTestPortalMe;
    if (!me) { window.location.href = "/login.html"; return; }
    if (me.role !== "Student" && me.role !== "Admin") {
      window.location.href = "/student/dashboard.html"; return;
    }

    // ── Params ───────────────────────────────────────────────────
    const params   = new URLSearchParams(window.location.search);
    const testId   = params.get("testId");
    const scrollTo = params.get("scrollTo");
    if (!testId) { window.location.href = "/student/dashboard.html"; return; }

    const alertBox    = document.getElementById("alertBox");
    const loadingEl   = document.getElementById("loadingState");
    const examLayout  = document.getElementById("examLayout");

    function showError(msg) {
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
    }

    // ── Start attempt ────────────────────────────────────────────
    let attempt;
    try {
      attempt = await Api.post(`/api/tests/${testId}/attempts`);
    } catch (err) {
      loadingEl.classList.add("d-none");
      showError(err.message || "Failed to start the exam. Please try again.");
      return;
    }

    const attemptId = attempt.attemptId || attempt.AttemptId;
    const testTitle = attempt.testTitle;
    const questions = (attempt.questions || []).sort((a, b) => a.orderIndex - b.orderIndex);

    // Swap skeleton → real layout
    loadingEl.classList.add("d-none");
    examLayout.classList.remove("d-none");

    // ── Topbar ───────────────────────────────────────────────────
    document.getElementById("testTitle").textContent = testTitle;
    document.title = `${testTitle} – WebTestPortal`;
    document.getElementById("attemptInfo").textContent =
      `Attempt #${attempt.attemptNumber} · ${questions.length} Question${questions.length !== 1 ? "s" : ""}`;

    // Bottom bar totals
    document.getElementById("bottomTotalCount").textContent = questions.length;

    // ── Helpers ──────────────────────────────────────────────────
    function escHtml(str) {
      const d = document.createElement("div");
      d.textContent = str ?? "";
      return d.innerHTML;
    }

    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // ── Render questions ─────────────────────────────────────────
    const container = document.getElementById("questionsContainer");

    container.innerHTML = questions.map((q, i) => {
      const opts   = (q.options || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      const isMulti = q.type !== 0;
      const inputType = isMulti ? "checkbox" : "radio";

      const optionsHtml = opts.map((o, oi) => `
        <div class="exam-opt${isMulti ? " is-checkbox" : ""}" data-opt-id="${o.id}" data-q-id="${q.id}">
          <input type="${inputType}" name="q_${q.id}" value="${o.id}" id="opt_${o.id}" class="exam-opt-input">
          <span class="opt-indicator"></span>
          <span class="opt-letter">${LETTERS[oi] || oi + 1}</span>
          <span class="opt-text">${escHtml(o.text)}</span>
        </div>
      `).join("");

      return `
        <div class="exam-q-card" id="qBlock_${q.id}" data-q-id="${q.id}" data-index="${i}">
          <div class="eqc-header">
            <div class="d-flex align-items-center gap-2">
              <span class="q-number">(Q${i + 1})</span>
              <span class="q-type-badge ${isMulti ? "violet" : "brand"}">
                ${isMulti ? "Multiple choice" : "Single choice"}
              </span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="q-weight-badge"><i class="bi bi-star-fill me-1"></i>${q.weight} pt</span>
              <button type="button" class="btn-flag" data-q-id="${q.id}" aria-label="Flag for review">
                <i class="bi bi-flag"></i><span class="flag-label d-none d-md-inline">Flag</span>
              </button>
            </div>
          </div>
          <div class="eqc-body">
            <p class="eqc-question-text">${escHtml(q.text)}</p>
            ${q.imagePath ? `<img src="${escHtml(q.imagePath)}" class="question-image mb-3" style="max-height:240px;border-radius:8px;" alt="">` : ""}
            <div class="eqc-options">${optionsHtml}</div>
          </div>
        </div>
      `;
    }).join("");

    // ── Option click handler (whole pill clickable) ───────────────
    container.querySelectorAll(".exam-opt").forEach(pill => {
      pill.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return; // let native handle it
        const input = pill.querySelector("input");
        if (!input) return;
        if (input.type === "radio") {
          document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
            r.checked = false;
            r.closest(".exam-opt")?.classList.remove("is-selected");
          });
          input.checked = true;
        } else {
          input.checked = !input.checked;
        }
        pill.classList.toggle("is-selected", input.checked);
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });

    // Sync selected class when native input changes (keyboard / accessibility)
    container.addEventListener("change", (e) => {
      if (!e.target.matches(".exam-opt-input")) return;
      const input = e.target;
      if (input.type === "radio") {
        document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
          r.closest(".exam-opt")?.classList.toggle("is-selected", r.checked);
        });
      } else {
        input.closest(".exam-opt")?.classList.toggle("is-selected", input.checked);
      }
      updateState();
      triggerAutoSave();
    });

    // ── Flag system ──────────────────────────────────────────────
    // Flags are persisted server-side on the attempt (see attempt.flaggedQuestionIds), so they
    // survive a refresh, a different device, or the student saving/exiting mid-test as a draft.
    // localStorage is kept only as an offline-friendly cache, seeded from whichever source has
    // data first — it's never the sole source of truth.
    const flagsKey = `flagged_q_${attemptId}`;
    const flagged  = new Set();
    (attempt.flaggedQuestionIds || []).forEach(id => flagged.add(id));
    if (flagged.size === 0) {
      try { JSON.parse(localStorage.getItem(flagsKey) || "[]").forEach(id => flagged.add(id)); } catch {}
    }
    try { localStorage.setItem(flagsKey, JSON.stringify([...flagged])); } catch {}

    // Reflect restored flags on the freshly-rendered cards/nav before the first updateState() call.
    flagged.forEach(qId => {
      document.getElementById(`qBlock_${qId}`)?.classList.add("flagged");
      const btn = document.querySelector(`.btn-flag[data-q-id="${qId}"]`);
      if (btn) {
        btn.classList.add("is-flagged");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "bi bi-flag-fill";
      }
    });

    container.querySelectorAll(".btn-flag").forEach(btn => {
      btn.addEventListener("click", () => {
        const qId = parseInt(btn.dataset.qId, 10);
        const card = document.getElementById(`qBlock_${qId}`);
        const icon = btn.querySelector("i");
        if (flagged.has(qId)) {
          flagged.delete(qId);
          icon.className = "bi bi-flag";
          btn.classList.remove("is-flagged");
          card?.classList.remove("flagged");
        } else {
          flagged.add(qId);
          icon.className = "bi bi-flag-fill";
          btn.classList.add("is-flagged");
          card?.classList.add("flagged");
        }
        try { localStorage.setItem(flagsKey, JSON.stringify([...flagged])); } catch {}
        updateState();
        // Explicitly persist the flag right away (not just on the next answer change) so it's
        // saved server-side even if the student flags a question and immediately exits.
        triggerAutoSave();
      });
    });

    // ── Autosave ─────────────────────────────────────────────────
    const saveBadge = document.getElementById("autosaveStatus");
    const saveText  = document.getElementById("autosaveText");
    let saveTimer   = null;

    function setSaveState(state, label) {
      if (!saveBadge) return;
      saveBadge.classList.remove("saving", "saved", "restored", "error");
      if (state) saveBadge.classList.add(state);
      const icon = saveBadge.querySelector("i");
      if (icon) icon.className =
        state === "saving"   ? "bi bi-arrow-repeat" :
        state === "saved"    ? "bi bi-cloud-check-fill" :
        state === "restored" ? "bi bi-cloud-download-fill" :
        state === "error"    ? "bi bi-exclamation-triangle-fill" : "bi bi-cloud";
      if (saveText) saveText.textContent = label;
    }

    function getAnswers() {
      return questions.map(q => ({
        questionId: q.id,
        selectedOptionIds: [...document.querySelectorAll(`input[name="q_${q.id}"]:checked`)]
          .map(el => parseInt(el.value, 10))
      }));
    }

    function triggerAutoSave() {
      if (saveTimer) clearTimeout(saveTimer);
      setSaveState("saving", "Saving…");
      saveTimer = setTimeout(async () => {
        try {
          await Api.post(`/api/attempts/${attemptId}/autosave`, {
            answers: getAnswers(),
            flaggedQuestionIds: [...flagged]
          });
          setSaveState("saved", "Saved");
        } catch {
          setSaveState("error", "Save failed");
        }
      }, 1200);
    }

    // ── Navigator ────────────────────────────────────────────────
    let activeQId = null;

    function buildNavigator() {
      const grid = document.getElementById("questionNavGrid");
      if (!grid) return;
      grid.innerHTML = questions.map((q, i) => `
        <button type="button" class="nav-btn" id="navBtn_${q.id}" data-q-id="${q.id}" title="Q${i+1}">
          <span>${i + 1}</span>
          <span class="nav-flag-dot"></span>
        </button>
      `).join("");

      grid.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const target = document.getElementById(`qBlock_${btn.dataset.qId}`);
          if (target) {
            setActive(btn.dataset.qId);
            target.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      });
    }

    function setActive(qId) {
      activeQId = String(qId);
      // Update card highlight
      container.querySelectorAll(".exam-q-card").forEach(c => c.classList.remove("is-active"));
      const activeCard = document.getElementById(`qBlock_${qId}`);
      if (activeCard) activeCard.classList.add("is-active");
      updateState();
    }

    function updateState() {
      let answered = 0;
      let flaggedCount = 0;

      questions.forEach(q => {
        const isAnswered  = document.querySelectorAll(`input[name="q_${q.id}"]:checked`).length > 0;
        const isFlagged   = flagged.has(q.id);
        const navBtn      = document.getElementById(`navBtn_${q.id}`);
        const card        = document.getElementById(`qBlock_${q.id}`);

        if (isAnswered) answered++;
        if (isFlagged) flaggedCount++;

        if (navBtn) {
          navBtn.classList.toggle("answered", isAnswered);
          navBtn.classList.toggle("flagged", isFlagged);
          navBtn.classList.toggle("active", activeQId === String(q.id));
        }
        if (card) card.classList.toggle("answered-card", isAnswered && !isFlagged);
      });

      const remaining = questions.length - answered;

      // Progress bar
      const pct = questions.length ? Math.round(answered / questions.length * 100) : 0;
      const bar = document.getElementById("navProgressBar");
      if (bar) bar.style.width = pct + "%";

      // Labels
      const lbl = document.getElementById("navProgressLabel");
      if (lbl) lbl.textContent = `${answered} / ${questions.length}`;

      // Stat chips
      const sa = document.getElementById("statAnswered");
      const sf = document.getElementById("statFlagged");
      const sr = document.getElementById("statRemaining");
      if (sa) sa.textContent = answered;
      if (sf) sf.textContent = flaggedCount;
      if (sr) sr.textContent = remaining;

      // Bottom bar
      const ba = document.getElementById("bottomAnsweredCount");
      if (ba) ba.textContent = answered;
    }

    // ── IntersectionObserver – auto-highlight current Q ──────────
    if (window.IntersectionObserver) {
      const observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.dataset.qId);
      }, { rootMargin: "-15% 0px -60% 0px", threshold: [0.15, 0.5] });
      container.querySelectorAll(".exam-q-card").forEach(c => observer.observe(c));
    }

    // ── Timer ────────────────────────────────────────────────────
    let totalSeconds = 0;
    if (attempt.deadlineUtc) {
      const timerInline  = document.getElementById("timerInline");
      const timerDisplay = document.getElementById("timerDisplay");

      if (timerInline) timerInline.classList.remove("d-none");

      const deadline = new Date(attempt.deadlineUtc).getTime();
      totalSeconds   = Math.max(0, Math.round((deadline - Date.now()) / 1000));

      function formatTime(secs) {
        const m = Math.floor(secs / 60), s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
      }

      const interval = setInterval(() => {
        const dist = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        const txt  = dist <= 0 ? "Time's Up!" : formatTime(dist);
        if (timerDisplay) timerDisplay.textContent = txt;

        // Topbar timer color
        if (timerInline) {
          timerInline.classList.remove("warning", "danger");
          if (dist <= 60)  timerInline.classList.add("danger");
          else if (dist <= 300) timerInline.classList.add("warning");
        }

        if (dist <= 0) { clearInterval(interval); submitTest(true); }
      }, 1000);
    }

    // ── Restore draft answers ────────────────────────────────────
    if (attempt.draftAnswers && attempt.draftAnswers.length > 0) {
      attempt.draftAnswers.forEach(draft => {
        draft.selectedOptionIds.forEach(optId => {
          const input = document.getElementById(`opt_${optId}`);
          if (input) {
            input.checked = true;
            input.closest(".exam-opt")?.classList.add("is-selected");
          }
        });
      });
      setSaveState("restored", "Draft restored");
    }

    // ── Initialize ───────────────────────────────────────────────
    buildNavigator();
    if (scrollTo && document.getElementById(`qBlock_${scrollTo}`)) {
      setActive(scrollTo);
      setTimeout(() => document.getElementById(`qBlock_${scrollTo}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } else if (questions.length > 0) {
      setActive(questions[0].id);
    }
    updateState();

    // ── Submit ───────────────────────────────────────────────────
    async function submitTest(isAuto = false) {
      const answers    = getAnswers();
      const answeredN  = answers.filter(a => a.selectedOptionIds.length > 0).length;

      if (!isAuto) {
        // Update modal counts
        document.getElementById("confirmTotalCount").textContent    = questions.length;
        document.getElementById("confirmAnsweredCount").textContent = answeredN;
        document.getElementById("confirmUnansweredCount").textContent = questions.length - answeredN;

        // Save state to session for submit-confirm page
        sessionStorage.setItem(`attempt_state_${attemptId}`, JSON.stringify({
          testId, testTitle,
          attemptNumber: attempt.attemptNumber,
          questions: questions.map(q => ({
            id: q.id,
            isAnswered: document.querySelectorAll(`input[name="q_${q.id}"]:checked`).length > 0,
            isFlagged: flagged.has(q.id)
          })),
          answers
        }));
        window.location.href = `/student/submit-confirm.html?attemptId=${attemptId}`;
        return;
      }

      // Auto-submit (time's up)
      try {
        await Api.post(`/api/attempts/${attemptId}/submit`, { answers });
        window.location.href = `/student/result.html?attemptId=${attemptId}`;
      } catch (err) {
        showError(err.message || "Submission failed.");
      }
    }

    document.getElementById("testForm").addEventListener("submit", e => { e.preventDefault(); submitTest(false); });
    document.getElementById("sidebarSubmitBtn")?.addEventListener("click", () => submitTest(false));

    // ── Exit ─────────────────────────────────────────────────────
    const exitModalEl = document.getElementById("exitExamModal");
    const exitModal = exitModalEl ? new bootstrap.Modal(exitModalEl) : null;
    document.getElementById("examExitBtn")?.addEventListener("click", () => exitModal?.show());
    document.getElementById("confirmExitExamBtn")?.addEventListener("click", () => {
      window.location.href = "/student/available-tests.html";
    });

  });
})();
