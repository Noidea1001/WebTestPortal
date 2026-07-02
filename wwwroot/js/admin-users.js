// ================================================
// admin-users.js - FULL FIXED (List + Create + Edit + Delete)
// ================================================

(function () {
    document.addEventListener("shell:ready", async () => {
        console.log("✅ Admin Users JS Loaded");

        const alertBox = document.getElementById("alertBox");

        function showError(msg) {
            if (alertBox) {
                alertBox.textContent = typeof msg === 'string' ? msg : (msg.message || "Something went wrong.");
                alertBox.classList.remove("d-none");
            }
            console.error(msg);
        }

        function clearError() {
            if (alertBox) alertBox.classList.add("d-none");
        }

        function getIdFromQuery() {
            const params = new URLSearchParams(window.location.search);
            const id = parseInt(params.get("id"), 10);
            return Number.isFinite(id) ? id : null;
        }

        function escapeHtml(str) {
            const div = document.createElement("div");
            div.textContent = str ?? "";
            return div.innerHTML;
        }

        // ====================== USERS LIST ======================
        const usersTableBody = document.getElementById("usersTableBody");
        if (usersTableBody) {
            const loadingState = document.getElementById("loadingState");
            const emptyState = document.getElementById("emptyUsers");
            const tableWrapper = document.getElementById("usersTableWrapper");

            async function loadUsers() {
                try {
                    const users = await Api.get("/api/users");
                    if (loadingState) loadingState.classList.add("d-none");

                    if (!users || users.length === 0) {
                        if (emptyState) emptyState.classList.remove("d-none");
                        return;
                    }

                    if (emptyState) emptyState.classList.add("d-none");
                    if (tableWrapper) tableWrapper.classList.remove("d-none");

                    usersTableBody.innerHTML = users.map(u => `
                        <tr>
                            <td>${escapeHtml(u.fullName || '—')}</td>
                            <td><strong>${escapeHtml(u.username)}</strong></td>
                            <td>${escapeHtml(u.email)}</td>
                            <td><span class="badge ${u.role === 'Admin' ? 'bg-danger' : 'bg-success'}">${u.role}</span></td>
                            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                            <td>
                                <a href="/admin/edit-user.html?id=${u.id}" class="btn btn-sm btn-outline-primary">Edit</a>
                                <a href="/admin/delete-user.html?id=${u.id}" class="btn btn-sm btn-outline-danger ms-1">Delete</a>
                            </td>
                        </tr>
                    `).join("");
                } catch (err) {
                    if (loadingState) loadingState.classList.add("d-none");
                    showError(err.message || "Failed to load users");
                }
            }

            loadUsers();
        }

        // ====================== CREATE USER ======================
        const createForm = document.getElementById("createUserForm");
        if (createForm) {
            createForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                clearError();
                const btn = createForm.querySelector('button[type="submit"]');
                WebTestPortalUI.setButtonLoading(btn, true);

                const payload = {
                    username: document.getElementById("cuUsername").value.trim(),
                    email: document.getElementById("cuEmail").value.trim(),
                    fullName: document.getElementById("cuFullName").value.trim(),
                    password: document.getElementById("cuPassword").value,
                    role: document.getElementById("cuRole").value
                };

                try {
                    await Api.post("/api/users", payload);
                    WebTestPortalUI.showToast("User created successfully!", "success");
                    window.location.href = "/admin/users.html";
                } catch (err) {
                    showError(err.message || "Failed to create user");
                } finally {
                    WebTestPortalUI.setButtonLoading(btn, false);
                }
            });
        }

        // ====================== EDIT USER ======================
        const editForm = document.getElementById("editUserForm");
        if (editForm) {
            const userId = getIdFromQuery();
            const loadingState = document.getElementById("loadingState");
            const editCard = document.getElementById("editUserCard");

            if (!userId) {
                showError({ message: "No user ID in URL." });
                if (loadingState) loadingState.classList.add("d-none");
                return;
            }

            Api.get(`/api/users/${userId}`)
                .then((user) => {
                    document.getElementById("euUsername").value = user.username || "";
                    document.getElementById("euEmail").value = user.email || "";
                    document.getElementById("euFullName").value = user.fullName || "";
                    document.getElementById("euRole").value = user.role || "Student";

                    if (loadingState) loadingState.classList.add("d-none");
                    if (editCard) editCard.classList.remove("d-none");
                })
                .catch((err) => {
                    if (loadingState) loadingState.classList.add("d-none");
                    showError("User not found or access denied.");
                });

            editForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                clearError();
                const btn = editForm.querySelector('button[type="submit"]');
                WebTestPortalUI.setButtonLoading(btn, true);

                const payload = {
                    username: document.getElementById("euUsername").value.trim(),
                    email: document.getElementById("euEmail").value.trim(),
                    fullName: document.getElementById("euFullName").value.trim(),
                    role: document.getElementById("euRole").value,
                    password: document.getElementById("euPassword").value || null
                };

                try {
                    await Api.put(`/api/users/${userId}`, payload);
                    WebTestPortalUI.showToast("User updated successfully!", "success");
                    window.location.href = "/admin/users.html";
                } catch (err) {
                    showError(err.message || "Failed to update user");
                } finally {
                    WebTestPortalUI.setButtonLoading(btn, false);
                }
            });
        }

        // ====================== DELETE USER ======================
        const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
        if (confirmDeleteBtn) {
            const userId = getIdFromQuery();
            const loadingState = document.getElementById("loadingState");
            const deleteCard = document.getElementById("deleteUserCard");

            if (!userId) {
                showError({ message: "No user ID in URL." });
                if (loadingState) loadingState.classList.add("d-none");
                return;
            }

            Api.get(`/api/users/${userId}`)
                .then((user) => {
                    document.getElementById("duUsername").textContent = user.username || "Unknown";
                    document.getElementById("duEmail").textContent = user.email || "—";
                    document.getElementById("duRole").textContent = user.role || "Student";

                    if (loadingState) loadingState.classList.add("d-none");
                    if (deleteCard) deleteCard.classList.remove("d-none");
                })
                .catch((err) => {
                    if (loadingState) loadingState.classList.add("d-none");
                    showError("User not found or access denied.");
                });

            confirmDeleteBtn.addEventListener("click", async () => {
                if (!confirm("Delete this user permanently?")) return;
                clearError();
                WebTestPortalUI.setButtonLoading(confirmDeleteBtn, true);

                try {
                    await Api.del(`/api/users/${userId}`);
                    WebTestPortalUI.showToast("User deleted successfully.", "success");
                    window.location.href = "/admin/users.html";
                } catch (err) {
                    showError(err.message || "Failed to delete user");
                    WebTestPortalUI.setButtonLoading(confirmDeleteBtn, false);
                }
            });
        }
    });
})();