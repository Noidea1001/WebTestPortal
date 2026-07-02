(function () {
  document.addEventListener("shell:ready", (e) => {
    const me = e.detail;
    document.getElementById("pUsername").value = me.username;
    document.getElementById("pFullName").value = me.fullName;
    document.getElementById("pEmail").value = me.email;
  });

  const profileForm = document.getElementById("profileForm");
  const profileAlert = document.getElementById("profileAlert");
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    profileAlert.classList.add("d-none");
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    WebTestPortalUI.setButtonLoading(submitBtn, true);

    const payload = {
      username: document.getElementById("pUsername").value.trim(),
      fullName: document.getElementById("pFullName").value.trim(),
      email: document.getElementById("pEmail").value.trim()
    };

    try {
      await Api.put("/api/auth/profile", payload);
      WebTestPortalUI.showToast("Profile updated successfully.", "success");
    } catch (err) {
      profileAlert.textContent = err.message || "Failed to update profile.";
      profileAlert.classList.remove("d-none");
    } finally {
      WebTestPortalUI.setButtonLoading(submitBtn, false);
    }
  });

  const passwordForm = document.getElementById("passwordForm");
  const passwordAlert = document.getElementById("passwordAlert");
  passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    passwordAlert.classList.add("d-none");
    const submitBtn = passwordForm.querySelector('button[type="submit"]');
    WebTestPortalUI.setButtonLoading(submitBtn, true);

    const payload = {
      currentPassword: document.getElementById("CurrentPassword").value,
      newPassword: document.getElementById("NewPassword").value,
      confirmPassword: document.getElementById("ConfirmPassword").value
    };

    try {
      await Api.post("/api/auth/change-password", payload);
      WebTestPortalUI.showToast("Password changed successfully.", "success");
      passwordForm.reset();
    } catch (err) {
      passwordAlert.textContent = err.message || "Failed to change password.";
      passwordAlert.classList.remove("d-none");
    } finally {
      WebTestPortalUI.setButtonLoading(submitBtn, false);
    }
  });
})();
