(async function () {
  const alertBox = document.getElementById("alertBox");
  const successBox = document.getElementById("successBox");

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
    successBox.classList.add("d-none");
  }

  function showSuccess(msg) {
    successBox.textContent = msg;
    successBox.classList.remove("d-none");
    alertBox.classList.add("d-none");
  }

  function clearAlerts() {
    alertBox.classList.add("d-none");
    successBox.classList.add("d-none");
  }

  // Redirect if already authenticated
  try {
    const me = await Api.get("/api/auth/me");
    if (me) {
      if (me.role === "Admin") {
        window.location.href = "/admin/dashboard.html";
      } else {
        window.location.href = "/student/dashboard.html";
      }
      return;
    }
  } catch (err) {
    // Normal: not logged in yet.
  }

  // Form Submission: Login
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlerts();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const user = await Api.post("/api/auth/login", { username, password });
      if (user.role === "Admin") {
        window.location.href = "/admin/dashboard.html";
      } else {
        window.location.href = "/student/dashboard.html";
      }
    } catch (err) {
      showAlert(err.message || "Login failed.");
    }
  });

  // Form Submission: Registration
  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlerts();

    const fullName = document.getElementById("registerFullName").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (username.length < 3) {
      showAlert("Username must be at least 3 characters long.");
      return;
    }
    if (password.length < 6) {
      showAlert("Password must be at least 6 characters long.");
      return;
    }

    try {
      await Api.post("/api/auth/register", { username, email, fullName, password });
      showSuccess("Account registered! You can now log in.");
      document.getElementById("registerForm").reset();

      // Switch to Login tab automatically
      const loginTabButton = document.getElementById("login-tab");
      const bsTab = bootstrap.Tab.getOrCreateInstance(loginTabButton);
      bsTab.show();
    } catch (err) {
      showAlert(err.message || "Registration failed.");
    }
  });
})();
