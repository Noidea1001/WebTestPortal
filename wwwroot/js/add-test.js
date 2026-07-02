(function () {
  document.addEventListener("shell:ready", () => {
    const alertBox = document.getElementById("alertBox");
    function showError(err) {
      if (!alertBox) return;
      alertBox.textContent = (err && err.message) || "Something went wrong.";
      alertBox.classList.remove("d-none");
    }

    document.getElementById("createTestForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('button[type="submit"]');
      WebTestPortalUI.setButtonLoading(submitBtn, true);

      const payload = {
        title: document.getElementById("ctTitle").value.trim(),
        description: document.getElementById("ctDescription").value.trim(),
        maxAttempts: parseInt(document.getElementById("ctMaxAttempts").value, 10) || 1,
        timeLimitMinutes: document.getElementById("ctTimeLimit").value ? parseInt(document.getElementById("ctTimeLimit").value, 10) : null,
        shuffleQuestions: document.getElementById("ctShuffleQuestions").checked,
        shuffleOptions: document.getElementById("ctShuffleOptions").checked
      };

      try {
        // Same behavior as the old CreateTest.cshtml: create the test, then
        // jump straight into the question editor for it.
        const test = await Api.post("/api/tests", payload);
        window.location.href = `/admin/edit-test.html?id=${test.id}`;
      } catch (err) {
        showError(err);
        WebTestPortalUI.setButtonLoading(submitBtn, false);
      }
    });
  });
})();
