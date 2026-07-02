// Student dashboard: available tests, attempt history, and personal analytics.
// All data comes from the existing REST API (api/tests/available, api/attempts/my);
// this script renders it. Waits for layout.js's "shell:ready" event so it only
// runs once we know the user is authenticated.
(function () {
  document.addEventListener("shell:ready", async (e) => {
    const whoAmI = document.getElementById("whoAmI");
    if (whoAmI) whoAmI.textContent = e.detail.fullName;

    const alertBox = document.getElementById("alertBox");
    function showError(msg) {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.classList.remove("d-none");
      setTimeout(() => alertBox.classList.add("d-none"), 4000);
    }

    function renderAvailableTests(tests) {
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
    }

    function renderHistory(attempts) {
      const tbody = document.getElementById("resultRows");
      document.getElementById("emptyResults").classList.toggle("d-none", attempts.length > 0);

      tbody.innerHTML = attempts.map(a => `
        <tr>
          <td>${escapeHtml(a.testTitle)}</td>
          <td>#${a.attemptNumber}</td>
          <td>${a.isCompleted
              ? '<span class="pro-badge success"><i class="bi bi-check-circle-fill"></i>Completed</span>'
              : '<span class="pro-badge warning"><i class="bi bi-hourglass-split"></i>In progress</span>'}</td>
          <td>${a.isCompleted ? `${a.score} / ${a.maxScore}` : "—"}</td>
          <td>
            ${a.isCompleted
              ? `<a href="/student/result.html?attemptId=${a.attemptId}" class="btn btn-sm btn-outline-secondary">View</a>`
              : `<a href="/student/take-test.html?testId=${a.testId}" class="btn btn-sm btn-outline-brand">Resume</a>`}
          </td>
        </tr>
      `).join("");
    }

    // Stats cards + charts (ported from the old server-rendered StudentController.Dashboard analytics).
    function renderAnalytics(availableTests, attempts) {
      const completed = attempts.filter(a => a.isCompleted);
      const inProgress = attempts.filter(a => !a.isCompleted);

      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setText("statAvailableCount", availableTests.filter(t => t.canAttempt).length);
      setText("statCompletedCount", completed.length);
      setText("statInProgressCount", inProgress.length);

      const buckets = [
        { label: "0-20%", count: 0 }, { label: "20-40%", count: 0 }, { label: "40-60%", count: 0 },
        { label: "60-80%", count: 0 }, { label: "80-100%", count: 0 }
      ];
      let passCount = 0, failCount = 0;
      completed.forEach(a => {
        const pct = a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0;
        if (pct < 20) buckets[0].count++;
        else if (pct < 40) buckets[1].count++;
        else if (pct < 60) buckets[2].count++;
        else if (pct < 80) buckets[3].count++;
        else buckets[4].count++;
        if (pct >= 60) passCount++; else failCount++;
      });

      const distColors = ["#f59e0b", "#8b5cf6", "#64748b", "#0ea5e9", "#14b8a6"];
      const distCanvas = document.getElementById("myScoreDistributionChart");
      if (distCanvas && completed.length > 0 && window.Chart) {
        new Chart(distCanvas.getContext("2d"), {
          type: "bar",
          data: {
            labels: buckets.map(b => b.label),
            datasets: [{ data: buckets.map(b => b.count), backgroundColor: distColors, borderRadius: 6 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: {
              label: ctx => ` ${ctx.parsed.y} attempt${ctx.parsed.y !== 1 ? "s" : ""} (${Math.round(ctx.parsed.y / completed.length * 100)}%)`
            } } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
          }
        });

        const distLegend = document.getElementById("distLegend");
        if (distLegend) {
          distLegend.innerHTML = buckets.map((b, i) => `
            <div class="dist-legend-item">
              <span class="dist-legend-swatch" style="background:${distColors[i]}"></span>
              <span class="dist-legend-label">${b.label}</span>
              <span class="dist-legend-count">${b.count}</span>
            </div>`).join("");
        }
        const distInsight = document.getElementById("distInsight");
        if (distInsight) {
          const avgPct = Math.round((completed.reduce((s, a) => s + (a.maxScore > 0 ? a.score / a.maxScore * 100 : 0), 0) / completed.length) * 10) / 10;
          const topBucket = buckets.reduce((best, b) => b.count > best.count ? b : best, buckets[0]);
          distInsight.innerHTML = `<i class="bi bi-graph-up-arrow text-brand"></i>Average score <strong>${avgPct}%</strong> across ${completed.length} attempt${completed.length !== 1 ? "s" : ""} — most fall in the <strong>${topBucket.label}</strong> range.`;
        }
      } else {
        document.getElementById("scoreDistEmpty")?.classList.remove("d-none");
        distCanvas?.classList.add("d-none");
      }

      const passFailCanvas = document.getElementById("myPassFailChart");
      const total = passCount + failCount;
      const pfTotalBadge = document.getElementById("pfTotalBadge");
      if (pfTotalBadge) pfTotalBadge.textContent = `${completed.length} attempt${completed.length !== 1 ? 's' : ''}`;

      if (passFailCanvas && total > 0 && window.Chart) {
        document.getElementById("passFailPanel")?.classList.remove("d-none");
        new Chart(passFailCanvas.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: ["Passed", "Failed"],
            datasets: [{
              data: [passCount, failCount],
              backgroundColor: ["#10b981", "#f59e0b"],
              borderWidth: 4,
              borderColor: "#fff",
              hoverBorderWidth: 4,
              cutout: "76%"
            }]
          },
          options: {
            responsive: false,
            animation: { animateRotate: true, duration: 900 },
            plugins: { legend: { display: false }, tooltip: { callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)`
            }}}
          }
        });
        const passRate = Math.round((passCount / total) * 1000) / 10;
        setText("passRateLabel", `${passRate}%`);
        setText("passCountLabel", passCount);
        setText("failCountLabel", failCount);
        const pcts = completed.map(a => a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0);
        setText("pfAvgScore", `${Math.round((pcts.reduce((s, p) => s + p, 0) / pcts.length) * 10) / 10}%`);
        setText("pfHighScore", `${Math.round(Math.max(...pcts) * 10) / 10}%`);
        // Animated bars
        setTimeout(() => {
          const passBar = document.getElementById("passBar");
          const failBar = document.getElementById("failBar");
          if (passBar) passBar.style.width = `${(passCount / total) * 100}%`;
          if (failBar) failBar.style.width = `${(failCount / total) * 100}%`;
        }, 100);
        // Insight
        const insight = document.getElementById("pfInsight");
        if (insight) {
          const r = passCount / total;
          if (r >= 0.8) insight.innerHTML = `<i class="bi bi-trophy-fill text-brand me-1"></i>Outstanding! You pass most of your tests.`;
          else if (r >= 0.6) insight.innerHTML = `<i class="bi bi-bar-chart-fill text-emerald-500 me-1"></i>Good performance — keep it up!`;
          else if (r >= 0.4) insight.innerHTML = `<i class="bi bi-exclamation-circle text-amber-500 me-1"></i>Mixed — review your weaker areas.`;
          else insight.innerHTML = `<i class="bi bi-x-circle text-danger me-1"></i>Keep studying — you can improve!`;
        }
      } else {
        document.getElementById("passFailEmpty")?.classList.remove("d-none");
        document.getElementById("passFailPanel")?.classList.add("d-none");
        passFailCanvas?.classList.add("d-none");
      }
    }

    try {
      const [availableTests, attempts] = await Promise.all([
        Api.get("/api/tests/available"),
        Api.get("/api/attempts/my")
      ]);
      renderAvailableTests(availableTests);
      renderHistory(attempts);
      renderAnalytics(availableTests, attempts);
    } catch (err) {
      showError(err.message);
    }
  });
})();
