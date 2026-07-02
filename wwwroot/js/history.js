(function () {
  document.addEventListener("shell:ready", async () => {

    const alertBox = document.getElementById("alertBox");
    function showError(msg) {
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
      setTimeout(() => alertBox.classList.add("d-none"), 5000);
    }

    let allAttempts = [];

    // ─── Fetch data ────────────────────────────────────────
    try {
      allAttempts = await Api.get("/api/attempts/my");
    } catch (err) {
      showError(err.message);
      return;
    }

    // ─── Stats ────────────────────────────────────────────
    function renderStats(attempts) {
      const completed = attempts.filter(a => a.isCompleted);
      const inProgress = attempts.filter(a => !a.isCompleted);
      document.getElementById("statTotal").textContent = attempts.length;
      document.getElementById("statCompleted").textContent = completed.length;
      document.getElementById("statInProgress").textContent = inProgress.length;

      if (completed.length > 0) {
        let best = 0;
        completed.forEach(a => {
          if (a.maxScore > 0) {
            const pct = Math.round((a.score / a.maxScore) * 100);
            if (pct > best) best = pct;
          }
        });
        document.getElementById("statBestScore").textContent = `${best}%`;
      } else {
        document.getElementById("statBestScore").textContent = "—";
      }
    }

    renderStats(allAttempts);

    // ─── Score percentage helper ───────────────────────────
    function scorePct(a) {
      if (!a.isCompleted || !a.maxScore) return null;
      return Math.round((a.score / a.maxScore) * 100);
    }

    // ─── Score bar colour ──────────────────────────────────
    function scoreBarClass(pct) {
      if (pct === null) return "";
      if (pct >= 80) return "emerald";
      if (pct >= 60) return "brand";
      if (pct >= 40) return "amber";
      return "rose";
    }

    // ─── Render card ──────────────────────────────────────
    function renderCard(a) {
      const pct = scorePct(a);
      const barClass = scoreBarClass(pct);
      const isCompleted = a.isCompleted;

      const statusBadge = isCompleted
        ? `<span class="history-status-badge completed"><i class="bi bi-check-circle-fill me-1"></i>Completed</span>`
        : `<span class="history-status-badge inprogress"><i class="bi bi-hourglass-split me-1"></i>In Progress</span>`;

      const scoreSection = isCompleted
        ? `<div class="history-score-block">
             <div class="history-score-bar-wrap">
               <div class="history-score-bar ${barClass}" style="width:${pct}%"></div>
             </div>
             <span class="history-score-value">${a.score} / ${a.maxScore} &nbsp;<span class="history-score-pct ${barClass}">${pct}%</span></span>
           </div>`
        : `<div class="history-score-block inprogress-msg">
             <i class="bi bi-pencil-square me-1 text-amber-500"></i>
             <span class="text-secondary" style="font-size:0.83rem;">In progress — resume to finish</span>
           </div>`;

      const action = isCompleted
        ? `<a href="/student/result.html?attemptId=${a.attemptId}" class="btn btn-sm btn-outline-brand">
             <i class="bi bi-eye me-1"></i>View Result
           </a>`
        : `<a href="/student/take-test.html?testId=${a.testId}" class="btn btn-sm btn-brand">
             <i class="bi bi-play-fill me-1"></i>Resume
           </a>`;

      const attemptDate = a.startedAt
        ? new Date(a.startedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "";

      return `
        <div class="history-card">
          <div class="history-card-left">
            <div class="history-card-meta">
              ${statusBadge}
              ${attemptDate ? `<span class="history-date"><i class="bi bi-calendar3 me-1"></i>${attemptDate}</span>` : ""}
              <span class="history-attempt-num">#${a.attemptNumber}</span>
            </div>
            <h5 class="history-card-title">${escapeHtml(a.testTitle)}</h5>
            ${scoreSection}
          </div>
          <div class="history-card-right">
            ${action}
          </div>
        </div>
      `;
    }

    // ─── Apply filters and render ─────────────────────────
    function applyFilters() {
      const search = document.getElementById("filterSearch").value.trim().toLowerCase();
      const status = document.querySelector('input[name="statusOpt"]:checked')?.value ?? "all";
      const score = document.getElementById("filterScore").value;
      const sort = document.getElementById("filterSort").value;

      let filtered = allAttempts.slice();

      // Search
      if (search) {
        filtered = filtered.filter(a => a.testTitle.toLowerCase().includes(search));
      }

      // Status
      if (status === "completed") filtered = filtered.filter(a => a.isCompleted);
      else if (status === "inprogress") filtered = filtered.filter(a => !a.isCompleted);

      // Score range (only applies to completed)
      if (score !== "all") {
        filtered = filtered.filter(a => {
          if (!a.isCompleted) return false;
          const pct = scorePct(a);
          if (pct === null) return false;
          if (score === "high") return pct >= 80;
          if (score === "mid") return pct >= 40 && pct < 80;
          if (score === "low") return pct < 40;
          return true;
        });
      }

      // Sort
      if (sort === "newest") {
        filtered.sort((a, b) => new Date(b.startedAt ?? 0) - new Date(a.startedAt ?? 0));
      } else if (sort === "oldest") {
        filtered.sort((a, b) => new Date(a.startedAt ?? 0) - new Date(b.startedAt ?? 0));
      } else if (sort === "score_desc") {
        filtered.sort((a, b) => (scorePct(b) ?? -1) - (scorePct(a) ?? -1));
      } else if (sort === "score_asc") {
        filtered.sort((a, b) => (scorePct(a) ?? 999) - (scorePct(b) ?? 999));
      }

      renderList(filtered);
      renderChips(search, status, score, sort);
    }

    function renderList(filtered) {
      const listEl = document.getElementById("historyList");
      const emptyEl = document.getElementById("emptyHistory");
      const countEl = document.getElementById("resultsCount");

      if (filtered.length === 0) {
        listEl.innerHTML = "";
        emptyEl.classList.remove("d-none");
        countEl.textContent = "No results";
      } else {
        emptyEl.classList.add("d-none");
        listEl.innerHTML = filtered.map(renderCard).join("");
        const word = filtered.length === 1 ? "attempt" : "attempts";
        countEl.textContent = `Showing ${filtered.length} ${word}`;
      }
    }

    function renderChips(search, status, score, sort) {
      const wrap = document.getElementById("activeFilterChips");
      const chips = [];

      if (search) chips.push({ label: `Search: "${search}"`, clear: () => { document.getElementById("filterSearch").value = ""; applyFilters(); } });
      if (status !== "all") chips.push({ label: status === "completed" ? "Completed" : "In Progress", clear: () => { document.getElementById("sAll").checked = true; applyFilters(); } });
      if (score !== "all") {
        const scoreLabels = { high: "≥ 80%", mid: "40–79%", low: "< 40%" };
        chips.push({ label: `Score: ${scoreLabels[score]}`, clear: () => { document.getElementById("filterScore").value = "all"; applyFilters(); } });
      }
      if (sort !== "newest") {
        const sortLabels = { oldest: "Oldest first", score_desc: "Highest score", score_asc: "Lowest score" };
        chips.push({ label: `Sort: ${sortLabels[sort]}`, clear: () => { document.getElementById("filterSort").value = "newest"; applyFilters(); } });
      }

      if (chips.length === 0) {
        wrap.classList.add("d-none");
        wrap.innerHTML = "";
      } else {
        wrap.classList.remove("d-none");
        wrap.innerHTML = chips.map((c, i) => `
          <span class="filter-chip" data-chip="${i}">
            ${escapeHtml(c.label)}
            <button class="filter-chip-remove" data-chip="${i}" title="Remove filter">&times;</button>
          </span>
        `).join("");
        wrap.querySelectorAll(".filter-chip-remove").forEach(btn => {
          btn.addEventListener("click", () => chips[parseInt(btn.dataset.chip)].clear());
        });
      }
    }

    // ─── Wire up filter controls ──────────────────────────
    document.getElementById("filterSearch").addEventListener("input", () => applyFilters());
    document.getElementById("filterScore").addEventListener("change", () => applyFilters());
    document.getElementById("filterSort").addEventListener("change", () => applyFilters());
    document.querySelectorAll('input[name="statusOpt"]').forEach(r => r.addEventListener("change", () => applyFilters()));

    document.getElementById("clearFiltersBtn").addEventListener("click", () => {
      document.getElementById("filterSearch").value = "";
      document.getElementById("sAll").checked = true;
      document.getElementById("filterScore").value = "all";
      document.getElementById("filterSort").value = "newest";
      applyFilters();
    });

    // ─── Initial render ───────────────────────────────────
    applyFilters();
  });
})();
