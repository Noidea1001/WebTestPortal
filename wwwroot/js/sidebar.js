(function () {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebarBackdrop');
  var toggle = document.getElementById('sidebarToggle');
  var closeBtn = document.getElementById('sidebarClose');

  function openSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add('sidebar--open');
    backdrop.classList.add('sidebar-backdrop--visible');
    document.body.classList.add('sidebar-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
    }
    // Move focus into the sidebar for accessibility
    var firstFocusable = sidebar.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('sidebar--open');
    backdrop.classList.remove('sidebar-backdrop--visible');
    document.body.classList.remove('sidebar-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  }

  if (toggle) toggle.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Close on Escape key when sidebar is open
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (sidebar && sidebar.classList.contains('sidebar--open')) {
        closeSidebar();
      }
    }
  });

  document.querySelectorAll('.sidebar-nav a').forEach(function(link) {
    link.addEventListener('click', function() {
      if (window.innerWidth < 992) closeSidebar();
    });
  });

  var prevWidth = window.innerWidth;
  window.addEventListener('resize', function() {
    var currWidth = window.innerWidth;
    if (currWidth >= 992 && prevWidth < 992) closeSidebar();
    prevWidth = currWidth;
  });

  // Initialize pagination on page load
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.pagination-controls').forEach(function(pagEl) {
      applyPagination(pagEl.closest('.card') || pagEl.closest('.fade-in-el') || document.body);
    });
  });

  // Table / card filter + pagination
  function applyFilter(container) {
    var input = container.querySelector('.table-filter');
    var select = container.querySelector('.table-filter-select');
    var targetId = input ? input.getAttribute('data-filter-target') : null;
    var table = targetId ? document.getElementById(targetId) : container;
    if (!table) return [];
    var rows = Array.from(table.querySelectorAll('.filter-row'));
    var query = input ? input.value.trim().toLowerCase() : '';
    var selectedValue = select ? select.value : '';

    rows.forEach(function(row) {
      var textEl = row.querySelector('.filter-text');
      var rowText = textEl ? textEl.textContent.trim().toLowerCase() : row.textContent.trim().toLowerCase();
      var textMatch = query === '' || rowText.indexOf(query) !== -1;

      var dropdownMatch = true;
      if (select && selectedValue) {
        var filterKey = select.getAttribute('data-filter-by');
        if (filterKey) {
          var rowValue = row.dataset[filterKey];
          dropdownMatch = rowValue ? rowValue.toLowerCase() === selectedValue.toLowerCase() : false;
        }
      }

      var match = textMatch && dropdownMatch;
      row.style.display = match ? '' : 'none';
      row.dataset.filterMatch = match ? 'true' : 'false';
    });
    return rows;
  }

  function applyPagination(container) {
    var rows = applyFilter(container);
    var pagEl = container.querySelector('.pagination-controls');
    if (!pagEl) return;
    var perPage = parseInt(pagEl.dataset.perPage, 10) || 10;
    var currentPage = parseInt(pagEl.dataset.page, 10) || 1;
    var visible = rows.filter(function(r) { return r.dataset.filterMatch === 'true'; });
    var totalPages = Math.max(1, Math.ceil(visible.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;
    pagEl.dataset.page = currentPage;
    visible.forEach(function(r, i) {
      var pageIdx = Math.floor(i / perPage) + 1;
      r.style.display = pageIdx === currentPage ? '' : 'none';
    });
    var info = pagEl.querySelector('.page-info');
    if (info) info.textContent = 'Page ' + currentPage + ' of ' + totalPages + ' (' + visible.length + ' total)';
    var prevBtn = pagEl.querySelector('.page-prev');
    var nextBtn = pagEl.querySelector('.page-next');
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (prevBtn) prevBtn.dataset.totalPages = totalPages;
  }

  // Expose pagination helper for other modules (search) to call
  window.WebTestPortal = window.WebTestPortal || {};
  window.WebTestPortal.applyPagination = applyPagination;

  // Search input handling moved to wwwroot/js/search.js for debounced realtime filtering and suggestions

  document.querySelectorAll('.page-prev').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var pagEl = this.closest('.pagination-controls');
      var page = parseInt(pagEl.dataset.page, 10);
      if (page > 1) { pagEl.dataset.page = page - 1; applyPagination(pagEl.closest('.card') || pagEl.closest('.fade-in-el') || document.body); }
    });
  });
  document.querySelectorAll('.page-next').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var pagEl = this.closest('.pagination-controls');
      var page = parseInt(pagEl.dataset.page, 10);
      var total = parseInt(this.dataset.totalPages, 10) || 1;
      if (page < total) { pagEl.dataset.page = page + 1; applyPagination(pagEl.closest('.card') || pagEl.closest('.fade-in-el') || document.body); }
    });
  });
})();
