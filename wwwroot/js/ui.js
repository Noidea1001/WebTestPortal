/* Shared UI helpers (small, dependency-free) */
(function () {
  var TOAST_ICONS = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill'
  };

  function getToastContainer() {
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type, duration) {
    if (!message) return;
    type = type === 'error' || type === 'info' ? type : 'success';
    duration = typeof duration === 'number' ? duration : 4500;

    var container = getToastContainer();
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    var icon = document.createElement('i');
    icon.className = 'bi ' + (TOAST_ICONS[type] || TOAST_ICONS.success) + ' toast-icon';

    var body = document.createElement('div');
    body.className = 'toast-body';
    body.textContent = message;

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.innerHTML = '&times;';

    toast.appendChild(icon);
    toast.appendChild(body);
    toast.appendChild(close);
    container.appendChild(toast);

    var dismissTimer = setTimeout(function () { dismiss(); }, duration);

    function dismiss() {
      clearTimeout(dismissTimer);
      if (toast.classList.contains('removing')) return;
      toast.classList.add('removing');
      toast.addEventListener('animationend', function () {
        toast.remove();
      }, { once: true });
    }

    close.addEventListener('click', dismiss);
  }

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;

    if (isLoading) {
      btn.classList.add('btn-loading');
      btn.disabled = true;

      // If spinner already exists, keep it.
      if (!btn.querySelector('.loading-spinner')) {
        var spinner = document.createElement('span');
        spinner.className = 'loading-spinner';
        var text = btn.querySelector('.btn-text');
        // Keep existing text structure; just prepend spinner.
        if (text) {
          btn.insertBefore(spinner, text);
        } else {
          btn.prepend(spinner);
        }
      }
    } else {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
      var sp = btn.querySelector('.loading-spinner');
      if (sp) sp.remove();
    }
  }

  function wireSubmitLoading(formSelector, buttonSelector) {
    var forms = document.querySelectorAll(formSelector);
    if (!forms || forms.length === 0) return;

    forms.forEach(function (form) {
      form.addEventListener('submit', function () {
        var btn = buttonSelector ? form.querySelector(buttonSelector) : form.querySelector('[type="submit"], button[type="submit"]');
        setButtonLoading(btn, true);
      });
    });
  }

  // Expose globally for other inline scripts (optional)
  window.WebTestPortalUI = {
    setButtonLoading: setButtonLoading,
    wireSubmitLoading: wireSubmitLoading,
    showToast: showToast
  };

  // Default bindings used by multiple pages
  document.addEventListener('DOMContentLoaded', function () {
    // TakeTest / SubmitTest forms
    wireSubmitLoading('form#testForm', 'button[type="submit"]');

    // QuestionEditor save
    wireSubmitLoading('form#questionForm', 'button[type="submit"]');

    // Floating label support for filled inputs on page load
    document.querySelectorAll(".floating-group .form-control").forEach(function(input) {
      if (input.value.trim() !== "") {
        input.classList.add("filled");
      }
      input.addEventListener("input", function() {
        if (this.value.trim() !== "") {
          this.classList.add("filled");
        } else {
          this.classList.remove("filled");
        }
      });
      input.addEventListener("blur", function() {
        if (this.value.trim() !== "") {
          this.classList.add("filled");
        } else {
          this.classList.remove("filled");
        }
      });
    });

    // Password visibility toggle
    document.querySelectorAll(".password-toggle").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var input = this.parentElement.querySelector(".form-control");
        var icon = this.querySelector("i");
        if (input) {
          if (input.type === "password") {
            input.type = "text";
            if (icon) icon.className = "bi bi-eye-slash";
          } else {
            input.type = "password";
            if (icon) icon.className = "bi bi-eye";
          }
        }
      });
    });
  });
})();

