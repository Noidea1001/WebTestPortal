(function () {
  document.addEventListener("shell:ready", async () => {
    const alertBox = document.getElementById("alertBox");
    function showError(err) {
      if (!alertBox) return;
      alertBox.textContent = (err && err.message) || "Failed to load dashboard.";
      alertBox.classList.remove("d-none");
    }

    try {
      const d = await Api.get("/api/admin/dashboard");

      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setText("statTotalTests", d.totalTests);
      setText("statPublishedTests", d.publishedTests);
      setText("statTotalUsers", d.totalUsers);
      setText("statTotalAttempts", d.totalAttempts);
      setText("statAvgScore", `${d.averageScorePercentage}%`);

      // Weekly attempt volume (bar)
      const volCanvas = document.getElementById("weeklyVolumeChart");
      if (volCanvas && window.Chart) {
        new Chart(volCanvas.getContext("2d"), {
          type: "bar",
          data: {
            labels: d.weeklyAttemptVolume.map(w => w.label),
            datasets: [{ label: "Attempts", data: d.weeklyAttemptVolume.map(w => w.count), backgroundColor: "#a48207", borderRadius: 6 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
          }
        });
      }
      const volTrendBadge = document.getElementById("volTrendBadge");
      if (volTrendBadge) {
        const week = d.weeklyAttemptVolume.map(w => w.count);
        const total = week.reduce((s, c) => s + c, 0);
        const firstHalf = week.slice(0, Math.floor(week.length / 2)).reduce((s, c) => s + c, 0);
        const secondHalf = week.slice(Math.ceil(week.length / 2)).reduce((s, c) => s + c, 0);
        const trendIcon = secondHalf > firstHalf ? "bi-graph-up-arrow text-emerald-600" : secondHalf < firstHalf ? "bi-graph-down-arrow text-rose-500" : "bi-dash-lg text-secondary";
        volTrendBadge.innerHTML = `<i class="bi ${trendIcon} me-1"></i>${total} this week`;
      }

      // Score distribution (bar)
      const distCanvas = document.getElementById("scoreDistChart");
      const totalScored = d.scoreDistribution.reduce((s, b) => s + b.count, 0);
      const distColors = ["#f59e0b", "#8b5cf6", "#64748b", "#0ea5e9", "#14b8a6"];
      if (distCanvas && totalScored > 0 && window.Chart) {
        new Chart(distCanvas.getContext("2d"), {
          type: "bar",
          data: {
            labels: d.scoreDistribution.map(b => b.label),
            datasets: [{ data: d.scoreDistribution.map(b => b.count), backgroundColor: distColors, borderRadius: 6 }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: {
              label: ctx => ` ${ctx.parsed.y} attempt${ctx.parsed.y !== 1 ? "s" : ""} (${Math.round(ctx.parsed.y / totalScored * 100)}%)`
            } } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
          }
        });
        const distLegend = document.getElementById("distLegend");
        if (distLegend) {
          distLegend.innerHTML = d.scoreDistribution.map((b, i) => `
            <div class="dist-legend-item">
              <span class="dist-legend-swatch" style="background:${distColors[i]}"></span>
              <span class="dist-legend-label">${b.label}</span>
              <span class="dist-legend-count">${b.count}</span>
            </div>`).join("");
        }
        const distInsight = document.getElementById("distInsight");
        if (distInsight) {
          const topBucket = d.scoreDistribution.reduce((best, b) => b.count > best.count ? b : best, d.scoreDistribution[0]);
          distInsight.innerHTML = `<i class="bi bi-graph-up-arrow text-brand"></i>Average score <strong>${d.averageScorePercentage}%</strong> across ${totalScored} completed attempt${totalScored !== 1 ? "s" : ""} — most fall in the <strong>${topBucket.label}</strong> range.`;
        }
      } else {
        document.getElementById("scoreDistEmpty")?.classList.remove("d-none");
        distCanvas?.classList.add("d-none");
      }

      // Pass / fail donut
      const pfCanvas = document.getElementById("passFailChart");
      const pfTotal = d.passCount + d.failCount;
      const pfTotalBadge = document.getElementById("pfTotalBadge");
      if (pfTotalBadge) pfTotalBadge.textContent = `${pfTotal} attempt${pfTotal !== 1 ? 's' : ''}`;

      if (pfCanvas && pfTotal > 0 && window.Chart) {
        document.getElementById("passFailPanel")?.classList.remove("d-none");
        new Chart(pfCanvas.getContext("2d"), {
          type: "doughnut",
          data: {
            labels: ["Passed", "Failed"],
            datasets: [{
              data: [d.passCount, d.failCount],
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
              label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / pfTotal * 100)}%)`
            }}}
          }
        });
        const rate = Math.round((d.passCount / pfTotal) * 1000) / 10;
        setText("passRateLabel", `${rate}%`);
        setText("passCountLabel", d.passCount);
        setText("failCountLabel", d.failCount);
        setText("pfAvgScore", `${d.averageScorePercentage}%`);
        setText("pfCompletedCount", d.completedAttempts);
        // Animated bars
        setTimeout(() => {
          const passBar = document.getElementById("passBar");
          const failBar = document.getElementById("failBar");
          if (passBar) passBar.style.width = `${(d.passCount / pfTotal) * 100}%`;
          if (failBar) failBar.style.width = `${(d.failCount / pfTotal) * 100}%`;
        }, 100);
        // Insight
        const insight = document.getElementById("pfInsight");
        if (insight) {
          const rate2 = d.passCount / pfTotal;
          if (rate2 >= 0.8) insight.innerHTML = `<i class="bi bi-trophy-fill text-brand me-1"></i>Excellent — ${Math.round(rate2*100)}% of students are passing.`;
          else if (rate2 >= 0.6) insight.innerHTML = `<i class="bi bi-bar-chart-fill text-emerald-500 me-1"></i>Good — most students are passing.`;
          else if (rate2 >= 0.4) insight.innerHTML = `<i class="bi bi-exclamation-circle text-amber-500 me-1"></i>Mixed results — consider reviewing difficulty.`;
          else insight.innerHTML = `<i class="bi bi-x-circle text-danger me-1"></i>Low pass rate — tests may need revision.`;
        }
      } else {
        document.getElementById("passFailEmpty")?.classList.remove("d-none");
        document.getElementById("passFailPanel")?.classList.add("d-none");
        pfCanvas?.classList.add("d-none");
      }

      // Recent published tests
      const testsList = document.getElementById("recentTestsList");
      if (testsList) {
        testsList.innerHTML = d.recentPublishedTests.length
          ? d.recentPublishedTests.map(t => `
              <a href="/admin/edit-test.html?id=${t.id}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                <span>${escapeHtml(t.title)}</span>
                <span class="badge bg-light text-dark border">${t.questionCount} q</span>
              </a>`).join("")
          : `<div class="text-muted small p-3">No published tests yet.</div>`;
      }

      // Recent attempts table
      const attemptsBody = document.getElementById("recentAttemptsBody");
      if (attemptsBody) {
        attemptsBody.innerHTML = d.recentAttempts.length
          ? d.recentAttempts.map(a => `
              <tr>
                <td>${escapeHtml(a.userName || "—")}</td>
                <td>${escapeHtml(a.testTitle)}</td>
                <td>${a.isCompleted ? `<span class="pro-badge success"><i class="bi bi-check-circle-fill"></i>${a.score} / ${a.maxScore}</span>` : '<span class="pro-badge warning"><i class="bi bi-hourglass-split"></i>In progress</span>'}</td>
                <td class="text-muted small">${new Date(a.startedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
              </tr>`).join("")
          : `<tr><td colspan="4" class="text-muted text-center py-3">No attempts yet.</td></tr>`;
      }
    } catch (err) {
      showError(err);
    }
  });
})();
