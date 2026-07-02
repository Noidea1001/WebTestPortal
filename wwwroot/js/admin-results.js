(function () {
  document.addEventListener("shell:ready", async () => {
    const alertBox = document.getElementById("alertBox");
    function showError(err) {
      if (!alertBox) return;
      alertBox.textContent = (err && err.message) || "Something went wrong.";
      alertBox.classList.remove("d-none");
    }
    const params = new URLSearchParams(window.location.search);

    // ---------------- Results overview page ----------------
    const resultsBody = document.getElementById("resultsTableBody");
    if (resultsBody) {
      try {
        const data = await Api.get("/api/admin/results");
        const rows = data.testResults;

        document.getElementById("emptyResultsState")?.classList.toggle("d-none", rows.length > 0);
        document.getElementById("resultsPanel")?.classList.toggle("d-none", rows.length === 0);

        const totalAttempts = rows.reduce((s, r) => s + r.totalAttempts, 0);
        const totalCompleted = rows.reduce((s, r) => s + r.completedAttempts, 0);
        const scored = rows.filter(r => r.completedAttempts > 0);
        const overallAvg = scored.length ? Math.round((scored.reduce((s, r) => s + r.averagePercentage, 0) / scored.length) * 10) / 10 : 0;
        document.getElementById("statTotalAttempts").textContent = totalAttempts;
        document.getElementById("statTotalCompleted").textContent = totalCompleted;
        document.getElementById("statOverallAvg").textContent = `${overallAvg}%`;

        const pillClass = (pct) => pct >= 70 ? "high" : pct >= 50 ? "mid" : "low";

        resultsBody.innerHTML = rows.map(r => {
          const earliest = r.earliestAttemptAt ? new Date(r.earliestAttemptAt) : null;
          const latest = r.latestAttemptAt ? new Date(r.latestAttemptAt) : null;
          const dateRange = earliest
            ? (earliest.getFullYear() === latest.getFullYear() && earliest.getMonth() === latest.getMonth()
                ? earliest.toLocaleDateString(undefined, { month: "short", year: "numeric" })
                : `${earliest.toLocaleDateString(undefined, { month: "short", year: "numeric" })} – ${latest.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`)
            : "—";

          return `
            <tr class="results-row filter-row" data-title="${escapeHtml(r.testTitle.toLowerCase())}">
              <td class="filter-text fw-semibold text-dark">${escapeHtml(r.testTitle)}</td>
              <td class="text-center fw-medium">${r.totalAttempts}</td>
              <td class="text-center text-muted">${r.completedAttempts}</td>
              <td class="text-center fw-medium">${r.averageScore}</td>
              <td class="text-center"><span class="score-pill ${pillClass(r.averagePercentage)}">${r.averagePercentage}%</span></td>
              <td class="text-center text-muted small">${dateRange}</td>
              <td class="text-end" style="padding-right:1.4rem;">
                ${r.totalAttempts > 0
                  ? `<a href="/admin/test-results.html?testId=${r.testId}" class="btn btn-sm btn-outline-brand"><i class="bi bi-eye me-1"></i>View</a>`
                  : '<span class="text-muted small">No data</span>'}
              </td>
            </tr>`;
        }).join("");
      } catch (err) {
        showError(err);
      }
    }

    // ---------------- Per-test results page ----------------
    const attemptsBody = document.getElementById("attemptsBody");
    if (attemptsBody) {
      const testId = params.get("testId");
      if (!testId) { window.location.href = "/admin/results.html"; return; }
      try {
        const data = await Api.get(`/api/admin/tests/${testId}/results`);
        document.getElementById("trTestTitle").textContent = data.testTitle;

        const attempts = data.attempts;
        document.getElementById("emptyAttemptsState")?.classList.toggle("d-none", attempts.length > 0);
        document.getElementById("attemptsPanel")?.classList.toggle("d-none", attempts.length === 0);

        const completed = attempts.filter(a => a.isCompleted);
        const passCount = completed.filter(a => a.maxScore > 0 && (a.score / a.maxScore) * 100 >= 70).length;
        const avgPct = completed.length ? Math.round((completed.reduce((s, a) => s + (a.maxScore > 0 ? a.score / a.maxScore * 100 : 0), 0) / completed.length) * 10) / 10 : 0;

        document.getElementById("statTrTotal").textContent = attempts.length;
        document.getElementById("statTrCompleted").textContent = completed.length;
        document.getElementById("statTrAvg").textContent = `${avgPct}%`;
        document.getElementById("statTrPassFail").textContent = `${passCount} / ${completed.length - passCount}`;

        function pctOf(a) { return a.isCompleted && a.maxScore > 0 ? (a.score / a.maxScore) * 100 : -1; }

        function renderAttemptRows(list) {
          attemptsBody.innerHTML = list.map(a => {
            const pct = a.isCompleted && a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 1000) / 10 : 0;
            const pctCls = pct >= 70 ? "high" : pct >= 50 ? "mid" : "low";
            const initials = (a.userName || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
            return `
              <tr>
                <td><div class="tr-user-cell"><div class="tr-user-avatar">${initials}</div><span class="fw-semibold text-dark">${escapeHtml(a.userName || "—")}</span></div></td>
                <td><span class="tr-attempt-chip">#${a.attemptNumber}</span></td>
                <td class="text-muted small">${new Date(a.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td class="text-muted small">${a.completedAt ? new Date(a.completedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                <td class="text-center fw-medium">${a.isCompleted ? `${a.score} / ${a.maxScore}` : '<span class="text-muted">—</span>'}</td>
                <td class="text-center">${a.isCompleted ? `<span class="tr-score-pill ${pctCls}">${pct}%</span>` : '<span class="text-muted">—</span>'}</td>
                <td class="text-center">${a.isCompleted
                  ? '<span class="tr-status-badge done"><i class="bi bi-check-circle-fill"></i> Done</span>'
                  : '<span class="tr-status-badge progress"><i class="bi bi-hourglass-split"></i> In Progress</span>'}</td>
                <td class="text-end" style="padding-right:1.4rem;">${a.isCompleted
                  ? `<a href="/admin/submission-detail.html?attemptId=${a.attemptId}" class="btn btn-sm btn-outline-brand"><i class="bi bi-eye me-1"></i>View</a>`
                  : '<span class="text-muted small">—</span>'}</td>
              </tr>`;
          }).join("");
          document.getElementById("trResultCount").textContent = `Showing ${list.length} of ${attempts.length} attempt${attempts.length !== 1 ? "s" : ""}`;
          document.getElementById("trNoMatches")?.classList.toggle("d-none", list.length > 0);
        }

        const searchInput  = document.getElementById("trSearch");
        const statusSelect = document.getElementById("trStatusFilter");
        const scoreSelect  = document.getElementById("trScoreFilter");
        const sortSelect   = document.getElementById("trSortBy");

        function applyFilters() {
          const q = (searchInput.value || "").trim().toLowerCase();
          const status = statusSelect.value;
          const scoreBand = scoreSelect.value;

          let list = attempts.filter(a => {
            if (q && !(a.userName || "").toLowerCase().includes(q)) return false;
            if (status === "completed" && !a.isCompleted) return false;
            if (status === "progress" && a.isCompleted) return false;
            if (scoreBand !== "all") {
              const p = pctOf(a);
              if (p < 0) return false; // exclude in-progress from score-band filters
              if (scoreBand === "pass" && p < 70) return false;
              if (scoreBand === "mid" && (p < 50 || p >= 70)) return false;
              if (scoreBand === "fail" && p >= 50) return false;
            }
            return true;
          });

          switch (sortSelect.value) {
            case "date-asc":   list.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)); break;
            case "score-desc": list.sort((a, b) => pctOf(b) - pctOf(a)); break;
            case "score-asc":  list.sort((a, b) => pctOf(a) - pctOf(b)); break;
            case "name-asc":   list.sort((a, b) => (a.userName || "").localeCompare(b.userName || "")); break;
            default:           list.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)); // date-desc
          }

          renderAttemptRows(list);
        }

        [searchInput, statusSelect, scoreSelect, sortSelect].forEach(el => {
          el.addEventListener("input", applyFilters);
          el.addEventListener("change", applyFilters);
        });
        document.getElementById("trClearFilters")?.addEventListener("click", () => {
          searchInput.value = "";
          statusSelect.value = "all";
          scoreSelect.value = "all";
          sortSelect.value = "date-desc";
          applyFilters();
        });

        applyFilters();
      } catch (err) {
        showError(err);
      }
    }

    // ---------------- Submission detail page ----------------
    const reviewContainer = document.getElementById("questionsReviewContainer");
    if (reviewContainer) {
      const attemptId = params.get("attemptId");
      if (!attemptId) { window.location.href = "/admin/results.html"; return; }
      try {
        const res = await Api.get(`/api/admin/attempts/${attemptId}`);

        function fmtDate(iso) {
          if (!iso) return "";
          return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
        }
        function fmtDuration(startedAt, completedAt) {
          if (!startedAt || !completedAt) return "—";
          const secs = Math.round((new Date(completedAt) - new Date(startedAt)) / 1000);
          if (secs < 60) return `${secs}s`;
          const m = Math.floor(secs / 60), s = secs % 60;
          return s > 0 ? `${m}m ${s}s` : `${m}m`;
        }
        function getGrade(pct) {
          if (pct >= 90) return { color: "#6366f1" };
          if (pct >= 80) return { color: "#10b981" };
          if (pct >= 70) return { color: "#f59e0b" };
          if (pct >= 60) return { color: "#f97316" };
          return { color: "#f43f5e" };
        }

        document.getElementById("sdSubtitle").textContent = `${res.testTitle} — ${res.userName} — Attempt #${res.attemptNumber}`;
        document.title = `${res.userName} — ${res.testTitle} — WebTestPortal`;

        const pct = Math.round(res.percentage ?? 0);
        const grade = getGrade(pct);

        // Score ring
        const circumference = 439.82;
        const fill = document.getElementById("scoreRingFill");
        fill.style.stroke = grade.color;
        fill.style.strokeDashoffset = circumference;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          fill.style.strokeDashoffset = circumference * (1 - pct / 100);
        }));
        const pctEl = document.getElementById("sdPercentage");
        pctEl.style.color = grade.color;
        pctEl.textContent = `${pct}%`;

        document.getElementById("sdUserName").textContent = res.userName || "—";
        document.getElementById("sdCompletedAt").textContent = res.completedAt ? `Submitted ${fmtDate(res.completedAt)}` : "In progress";
        document.getElementById("sdScore").textContent = `${res.score}/${res.maxScore}`;
        document.getElementById("sdDuration").textContent = fmtDuration(res.startedAt, res.completedAt);

        // Pass/fail chip
        const passing = res.passingScorePercent ?? 60;
        const chip = document.getElementById("sdPassChip");
        if (pct >= passing) {
          chip.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>Passed';
          chip.style.cssText = "background:#ecfdf5;color:#059669;border:1.5px solid #6ee7b7;";
        } else {
          chip.innerHTML = '<i class="bi bi-x-octagon-fill me-1"></i>Not Passed';
          chip.style.cssText = "background:#fff1f2;color:#e11d48;border:1.5px solid #fda4af;";
        }

        // Stats
        const questions = res.questions || [];
        const correctCnt = questions.filter(q => q.isCorrect).length;
        const skippedCnt = questions.filter(q => !q.selectedOptionIds || q.selectedOptionIds.length === 0).length;
        const incorrectCnt = questions.length - correctCnt - skippedCnt;
        document.getElementById("statCorrect").textContent = correctCnt;
        document.getElementById("statIncorrect").textContent = incorrectCnt;
        document.getElementById("statSkipped").textContent = skippedCnt;
        document.getElementById("fc-all").textContent = questions.length;
        document.getElementById("fc-correct").textContent = correctCnt;
        document.getElementById("fc-incorrect").textContent = incorrectCnt;
        document.getElementById("fc-skipped").textContent = skippedCnt;

        // Question cards — (Q#) numbering + uppercase (A)(B)(C) option letters
        const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        reviewContainer.innerHTML = questions.map((q, idx) => {
          const isSkipped = !q.selectedOptionIds || q.selectedOptionIds.length === 0;
          const stateClass = isSkipped ? "is-skipped" : q.isCorrect ? "is-correct" : "is-incorrect";
          const typeLabel = q.type === 0 ? "Single choice" : "Multiple choice";
          const typeClass = q.type === 0 ? "brand" : "violet";

          let statusBadge;
          if (isSkipped) {
            statusBadge = `<span class="q-type-badge" style="background:var(--slate-100);color:var(--slate-500);border-color:var(--border);"><i class="bi bi-dash-circle me-1"></i>Skipped</span>`;
          } else if (q.isCorrect) {
            statusBadge = `<span class="q-type-badge" style="background:#ecfdf5;color:#059669;border-color:#6ee7b7;"><i class="bi bi-check-circle-fill me-1"></i>Correct</span>`;
          } else {
            statusBadge = `<span class="q-type-badge" style="background:#fff1f2;color:#e11d48;border-color:#fda4af;"><i class="bi bi-x-circle-fill me-1"></i>Incorrect</span>`;
          }

          const optionsHtml = q.options.map((o, optIdx) => {
            const sel = (q.selectedOptionIds || []).includes(o.id);
            const cor = (q.correctOptionIds || []).includes(o.id);
            const letter = `(${LETTERS[optIdx] || optIdx + 1})`;
            let rowClass = "", icon = "", badges = "";
            if (sel && cor) { rowClass = "is-correct-selected"; icon = '<i class="bi bi-check-circle-fill ro-icon" style="color:#10b981;"></i>'; badges = '<span class="ro-badge your-ans">Your Answer</span>'; }
            else if (sel && !cor) { rowClass = "is-wrong-selected"; icon = '<i class="bi bi-x-circle-fill ro-icon" style="color:#f43f5e;"></i>'; badges = '<span class="ro-badge your-ans">Your Answer</span>'; }
            else if (!sel && cor) { rowClass = "is-correct-missed"; icon = '<i class="bi bi-check-circle ro-icon" style="color:#10b981;"></i>'; badges = '<span class="ro-badge correct-ans">Correct Answer</span>'; }
            else { icon = '<i class="bi bi-circle ro-icon" style="color:var(--slate-300);"></i>'; }
            return `
              <div class="result-option-row ${rowClass}">
                ${icon}
                <span class="ro-letter">${letter}</span>
                <span class="ro-text">${escapeHtml(o.text)}</span>
                ${badges}
              </div>`;
          }).join("");

          const ptColor = q.isCorrect ? "#059669" : isSkipped ? "var(--slate-400)" : "#e11d48";
          const explanationHtml = q.explanation
            ? `<div class="explanation-box"><i class="bi bi-lightbulb-fill me-1" style="color:var(--brand-500)"></i><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</div>`
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
                <p class="rq-text">${escapeHtml(q.questionText)}</p>
                ${q.imagePath ? `<img src="${escapeHtml(q.imagePath)}" class="question-image mb-3" style="max-height:220px;border-radius:8px;" alt="Question image">` : ""}
                <div>${optionsHtml}</div>
                ${explanationHtml}
                <div class="rq-score-row">
                  <span class="text-secondary" style="font-size:0.82rem;font-weight:600;">SCORE AWARDED</span>
                  <span class="rq-score-earned" style="color:${ptColor}">${q.scoreAwarded} / ${q.weight} pts</span>
                </div>
              </div>
            </div>`;
        }).join("");

        // Filter tabs
        const tabs = document.querySelectorAll(".result-filter-btn");
        const cards = document.querySelectorAll("#questionsReviewContainer .result-q-card");
        tabs.forEach(btn => {
          btn.addEventListener("click", () => {
            tabs.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset.filter;
            cards.forEach(card => {
              card.style.display = (filter === "all" || card.dataset.state === filter) ? "" : "none";
            });
          });
        });

        document.getElementById("btnPrint")?.addEventListener("click", () => window.print());
      } catch (err) {
        showError(err);
      }
    }
  });
})();
