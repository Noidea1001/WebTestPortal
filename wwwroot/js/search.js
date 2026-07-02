(function(){
  // Debounce helper
  function debounce(fn, wait) {
    var t;
    return function() {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function(){ fn.apply(null, args); }, wait);
    };
  }

  function getContainer(el){
    return el.closest('.card') || el.closest('.fade-in-el') || document.body;
  }

  function collectSuggestions(container){
    var rows = Array.from(container.querySelectorAll('.filter-row'));
    var set = new Set();
    rows.forEach(function(r){
      var t = r.querySelector('.filter-text');
      if (t) set.add(t.textContent.trim());
    });
    return Array.from(set).slice(0, 50);
  }

  function makeDropdown(input){
    var wrap = document.createElement('div');
    wrap.className = 'search-suggestions';
    wrap.style.position = 'absolute';
    wrap.style.zIndex = 99999;
    wrap.style.minWidth = '200px';
    wrap.style.maxHeight = '220px';
    wrap.style.overflow = 'auto';
    wrap.style.background = 'white';
    wrap.style.border = '1px solid rgba(0,0,0,0.08)';
    wrap.style.borderRadius = '8px';
    wrap.style.boxShadow = '0 8px 30px rgba(15,23,42,0.08)';
    wrap.style.padding = '6px';
    wrap.style.display = 'none';
    document.body.appendChild(wrap);
    return wrap;
  }

  function positionDropdown(input, dropdown){
    var rect = input.getBoundingClientRect();
    dropdown.style.left = (rect.left + window.scrollX) + 'px';
    dropdown.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    dropdown.style.minWidth = Math.max(rect.width, 220) + 'px';
  }

  function showSuggestions(input, dropdown, list){
    dropdown.innerHTML = '';
    if (!list || list.length === 0) { dropdown.style.display = 'none'; return; }
    list.forEach(function(item){
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'suggestion-item';
      el.style.display = 'block';
      el.style.width = '100%';
      el.style.border = 'none';
      el.style.background = 'transparent';
      el.style.padding = '8px 10px';
      el.style.textAlign = 'left';
      el.style.cursor = 'pointer';
      el.style.borderRadius = '6px';
      el.textContent = item;
      el.addEventListener('click', function(){
        input.value = item;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        dropdown.style.display = 'none';
      });
      el.addEventListener('mouseover', function(){ el.style.background = 'rgba(99,102,241,0.06)'; });
      el.addEventListener('mouseout', function(){ el.style.background = 'transparent'; });
      dropdown.appendChild(el);
    });
    dropdown.style.display = 'block';
  }

  function setup(input){
    var container = getContainer(input);
    var dropdown = makeDropdown(input);
    var suggestions = collectSuggestions(container);
    // ensure clear button exists
    var clearBtn = input.parentElement && input.parentElement.querySelector('.table-filter-clear');
    if (!clearBtn) {
      clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'table-filter-clear';
      clearBtn.setAttribute('aria-label', 'Clear search');
      clearBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
      // position inside input group if available
      if (input.parentElement) input.parentElement.appendChild(clearBtn);
    }
    // toggle clear visibility
    function updateClear(){ clearBtn.style.display = input.value.trim() !== '' ? 'block' : 'none'; }
    updateClear();
    clearBtn.addEventListener('click', function(){ input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); updateClear(); dropdown.style.display = 'none'; input.focus(); });

    function update(){
      var q = input.value.trim().toLowerCase();
      var select = container.querySelector('.table-filter-select');
      var selectedValue = select ? select.value : '';
      var targetId = input.getAttribute('data-filter-target');
      var table = targetId ? document.getElementById(targetId) : container;
      if (!table) {
        dropdown.style.display = 'none';
        return;
      }

      var rows = Array.from(table.querySelectorAll('.filter-row'));
      var qlc = q;
      rows.forEach(function(row){
        var textEl = row.querySelector('.filter-text');
        var txt = textEl ? textEl.textContent.trim().toLowerCase() : row.textContent.trim().toLowerCase();
        var textMatch = qlc === '' || txt.indexOf(qlc) !== -1;

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

      if (window.WebTestPortal && window.WebTestPortal.applyPagination) window.WebTestPortal.applyPagination(container);

      if (qlc !== '') {
        var filtered = suggestions.filter(function(s){ return s.toLowerCase().indexOf(qlc) !== -1; }).slice(0,8);
        if (filtered.length > 0) {
          showSuggestions(input, dropdown, filtered);
          positionDropdown(input, dropdown);
        } else {
          dropdown.style.display = 'none';
        }
      } else {
        dropdown.style.display = 'none';
      }
    }

    var debounced = debounce(update, 120);
    input.addEventListener('input', function(e){ updateClear(); update(); debounced(e); });

    input.addEventListener('focus', function(){
      suggestions = collectSuggestions(container);
      positionDropdown(input, dropdown);
    });

    var select = container.querySelector('.table-filter-select');
    if (select) {
      select.addEventListener('change', function() {
        update();
      });
    }

    // close on outside click
    document.addEventListener('click', function(e){
      if (!dropdown.contains(e.target) && e.target !== input) dropdown.style.display = 'none';
    });

    // reposition on resize/scroll
    window.addEventListener('resize', function(){ if (dropdown.style.display !== 'none') positionDropdown(input, dropdown); });
    window.addEventListener('scroll', function(){ if (dropdown.style.display !== 'none') positionDropdown(input, dropdown); }, true);
  }

  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.table-filter').forEach(function(input){ setup(input); });
  });

})();
