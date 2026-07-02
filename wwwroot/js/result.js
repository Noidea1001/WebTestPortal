(function () {
  document.addEventListener("shell:ready", async () => {
    const attemptId = new URLSearchParams(window.location.search).get("attemptId");
    if (!attemptId) { window.location.href = "/student/dashboard.html"; return; }

    const alertBox   = document.getElementById("alertBox");
    const loadingEl  = document.getElementById("loadingState");
    const contentEl  = document.getElementById("resultContent");

    function showError(msg) {
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
      loadingEl.classList.add("d-none");
    }

    function escHtml(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function fmtDuration(startedAt, completedAt) {
      if (!startedAt || !completedAt) return "—";
      const secs = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);
      if (secs < 60) return `${secs}s`;
      const m = Math.floor(secs / 60), s = secs % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }

    function fmtDate(iso) {
      if (!iso) return "";
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium", timeStyle: "short"
      });
    }

    // ── Grade config ────────────────────────────────────────────
    function getGrade(pct) {
      if (pct >= 90) return { letter: "A", color: "#6366f1", bg: "#eef2ff" };
      if (pct >= 80) return { letter: "B", color: "#10b981", bg: "#ecfdf5" };
      if (pct >= 70) return { letter: "C", color: "#f59e0b", bg: "#fffbeb" };
      if (pct >= 60) return { letter: "D", color: "#f97316", bg: "#fff7ed" };
      return             { letter: "F", color: "#f43f5e", bg: "#fff1f2" };
    }

    // ── Animate score ring ──────────────────────────────────────
    function animateRing(pct, grade) {
      const circumference = 439.82; // 2 * π * 70
      const fill = document.getElementById("scoreRingFill");
      fill.style.stroke = grade.color;
      fill.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fill.style.strokeDashoffset = circumference * (1 - pct / 100);
        });
      });
      const pctEl = document.getElementById("scoreRingPct");
      pctEl.style.color = grade.color;
      // Count-up animation
      let current = 0;
      const step = pct / 60;
      const timer = setInterval(() => {
        current = Math.min(current + step, pct);
        pctEl.textContent = Math.round(current) + "%";
        if (current >= pct) clearInterval(timer);
      }, 16);
    }

    // ── Load & render ───────────────────────────────────────────
    let res;
    try {
      res = await Api.get(`/api/attempts/${attemptId}/result`);
    } catch (err) {
      showError(err.message || "Failed to load results.");
      return;
    }

    loadingEl.classList.add("d-none");
    contentEl.classList.remove("d-none");

    const pct   = Math.round(res.percentage ?? 0);
    const grade = getGrade(pct);

    // ── Header ──
    document.getElementById("testTitle").textContent  = res.testTitle;
    document.getElementById("attemptMeta").textContent =
      `Attempt #${res.attemptNumber} · Submitted ${fmtDate(res.completedAt)}`;

    // ── Ring & grade ──
    animateRing(pct, grade);
    document.getElementById("resultTitle").textContent =
      `${res.score} / ${res.maxScore} points`;
    document.getElementById("completedAt").textContent =
      res.completedAt ? `Completed ${fmtDate(res.completedAt)}` : "";

    const gradeBadge = document.getElementById("gradeBadge");
    gradeBadge.textContent = grade.letter;
    gradeBadge.style.background  = grade.bg;
    gradeBadge.style.color        = grade.color;
    gradeBadge.style.borderColor  = grade.color + "44";

    // ── Pass / Fail chip ──
    const passing = res.passingScorePercent ?? 60;
    const isPassed = pct >= passing;
    const chip = document.getElementById("passChip");
    if (isPassed) {
      chip.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>Passed';
      chip.style.cssText = "background:#ecfdf5;color:#059669;border:1.5px solid #6ee7b7;";
    } else {
      chip.innerHTML = '<i class="bi bi-x-octagon-fill me-1"></i>Not Passed';
      chip.style.cssText = "background:#fff1f2;color:#e11d48;border:1.5px solid #fda4af;";
    }

    // ── Stats strip ──
    const questions  = res.questions || [];
    const correctCnt   = questions.filter(q => q.isCorrect).length;
    const skippedCnt   = questions.filter(q => !q.selectedOptionIds || q.selectedOptionIds.length === 0).length;
    const incorrectCnt = questions.length - correctCnt - skippedCnt;

    document.getElementById("statCorrect").textContent   = correctCnt;
    document.getElementById("statIncorrect").textContent = incorrectCnt;
    document.getElementById("statSkipped").textContent   = skippedCnt;
    document.getElementById("statPoints").textContent    = `${res.score}/${res.maxScore}`;
    document.getElementById("statTime").textContent      = fmtDuration(res.startedAt, res.completedAt);

    // ── Filter counts ──
    document.getElementById("fc-all").textContent       = questions.length;
    document.getElementById("fc-correct").textContent   = correctCnt;
    document.getElementById("fc-incorrect").textContent = incorrectCnt;
    document.getElementById("fc-skipped").textContent   = skippedCnt;

    // ── Review gate ──
    if (!res.allowReview) {
      document.getElementById("reviewSection").classList.add("d-none");
      document.getElementById("noReviewGate").classList.remove("d-none");
    } else {
      renderQuestions(questions);
      wireFilters(questions);
    }

    // ── Print ──
    document.getElementById("btnPrint").addEventListener("click", () => window.print());
  });

  // ── Render question cards ────────────────────────────────────
  function renderQuestions(questions) {
    function escHtml(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    const container = document.getElementById("questionsContainer");
    container.innerHTML = questions.map((q, idx) => {
      const isSkipped   = !q.selectedOptionIds || q.selectedOptionIds.length === 0;
      const stateClass  = isSkipped ? "is-skipped" : q.isCorrect ? "is-correct" : "is-incorrect";
      const typeLabel   = q.type === 0 ? "Single choice" : "Multiple choice";
      const typeClass   = q.type === 0 ? "brand" : "violet";

      let statusBadge;
      if (isSkipped) {
        statusBadge = `<span class="q-type-badge" style="background:var(--slate-100);color:var(--slate-500);border-color:var(--border);">
          <i class="bi bi-dash-circle me-1"></i>Skipped</span>`;
      } else if (q.isCorrect) {
        statusBadge = `<span class="q-type-badge" style="background:#ecfdf5;color:#059669;border-color:#6ee7b7;">
          <i class="bi bi-check-circle-fill me-1"></i>Correct</span>`;
      } else {
        statusBadge = `<span class="q-type-badge" style="background:#fff1f2;color:#e11d48;border-color:#fda4af;">
          <i class="bi bi-x-circle-fill me-1"></i>Incorrect</span>`;
      }

      const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const optionsHtml = q.options.map((opt, optIdx) => {
        const isSelected = (q.selectedOptionIds || []).includes(opt.id);
        const isCorrectOpt = (q.correctOptionIds || []).includes(opt.id);
        const letter = `(${LETTERS[optIdx] || optIdx + 1})`;

        let rowClass = "", icon = "", badges = "";
        if (isSelected && isCorrectOpt) {
          rowClass = "is-correct-selected";
          icon     = '<i class="bi bi-check-circle-fill ro-icon" style="color:#10b981;"></i>';
          badges   = '<span class="ro-badge your-ans">Your Answer</span>';
        } else if (isSelected && !isCorrectOpt) {
          rowClass = "is-wrong-selected";
          icon     = '<i class="bi bi-x-circle-fill ro-icon" style="color:#f43f5e;"></i>';
          badges   = '<span class="ro-badge your-ans">Your Answer</span>';
        } else if (!isSelected && isCorrectOpt) {
          rowClass = "is-correct-missed";
          icon     = '<i class="bi bi-check-circle ro-icon" style="color:#10b981;"></i>';
          badges   = '<span class="ro-badge correct-ans">Correct Answer</span>';
        } else {
          icon = '<i class="bi bi-circle ro-icon" style="color:var(--slate-300);"></i>';
        }

        return `
          <div class="result-option-row ${rowClass}">
            ${icon}
            <span class="ro-letter">${letter}</span>
            <span class="ro-text">${escHtml(opt.text)}</span>
            ${badges}
          </div>`;
      }).join("");

      const ptColor = q.isCorrect ? "#059669" : isSkipped ? "var(--slate-400)" : "#e11d48";

      const explanationHtml = q.explanation
        ? `<div class="explanation-box">
             <i class="bi bi-lightbulb-fill me-1" style="color:var(--brand-500)"></i>
             <strong>Explanation:</strong> ${escHtml(q.explanation)}
           </div>`
        : "";

      return `
        <div class="result-q-card ${stateClass}" data-state="${isSkipped ? 'skipped' : q.isCorrect ? 'correct' : 'incorrect'}">
          <div class="rq-header">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="q-number">(Q${idx + 1})</span>
              <span class="q-type-badge ${typeClass}">${typeLabel}</span>
              ${statusBadge}
            </div>
            <span class="q-weight-badge"><i class="bi bi-star-fill me-1"></i>${q.weight} pt</span>
          </div>
          <div class="rq-body">
            <p class="rq-text">${escHtml(q.questionText)}</p>
            ${q.imagePath ? `<img src="${escHtml(q.imagePath)}" class="question-image mb-3" style="max-height:220px;border-radius:8px;" alt="Question image">` : ""}
            <div>${optionsHtml}</div>
            ${explanationHtml}
            <div class="rq-score-row">
              <span class="text-secondary" style="font-size:0.82rem;font-weight:600;">SCORE AWARDED</span>
              <span class="rq-score-earned" style="color:${ptColor}">
                ${q.scoreAwarded} / ${q.weight} pts
              </span>
            </div>
          </div>
        </div>`;
    }).join("");
  }

  // ── Filter tabs ─────────────────────────────────────────────
  function wireFilters(questions) {
    const tabs     = document.querySelectorAll(".result-filter-btn");
    const cards    = document.querySelectorAll("#questionsContainer .result-q-card");
    const emptyMsg = document.getElementById("filterEmpty");

    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.dataset.filter;
        let visible = 0;
        cards.forEach(card => {
          const show = filter === "all" || card.dataset.state === filter;
          card.style.display = show ? "" : "none";
          if (show) visible++;
        });
        emptyMsg.classList.toggle("d-none", visible > 0);
      });
    });
  }
})();
