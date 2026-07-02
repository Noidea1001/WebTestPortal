// Thin wrapper around fetch() that always sends the auth cookie and
// throws a normalized Error with the server's message on failure.
const Api = (() => {
  async function request(method, url, body) {
    const opts = {
      method,
      credentials: "include",
      headers: {}
    };

    if (body instanceof FormData) {
      opts.body = body; // let the browser set the multipart boundary
    } else if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);

    if (res.status === 204) return null;

    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }

    if (!res.ok) {
      const message = (data && data.message) ? data.message : `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    return data;
  }

  return {
    get: (url) => request("GET", url),
    post: (url, body) => request("POST", url, body),
    put: (url, body) => request("PUT", url, body),
    del: (url) => request("DELETE", url)
  };
})();

// Redirects unauthenticated / wrong-role visitors away from a protected page.
async function requireRole(role) {
  try {
    const me = await Api.get("/api/auth/me");
    if (me.role !== role && !(role === "Student" && me.role === "Admin")) {
      // Admins are allowed to view student pages too, for testing; students can't see admin pages.
      if (role === "Admin") {
        window.location.href = "/student/dashboard.html";
        return null;
      }
    }
    return me;
  } catch {
    window.location.href = "/login.html";
    return null;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
