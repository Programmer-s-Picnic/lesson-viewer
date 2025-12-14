(function toolbarModule() {
  // =========================================================
  // TOOLBAR MODULE
  // - Handles collapsing / expanding the top toolbar.
  // - When collapsed, it clones hidden controls into a dropdown.
  // - It also persists collapsed preference in localStorage.
  // =========================================================

  // DOM references: if you rename IDs in index.html, update here too.
  const toolbar = document.getElementById('toolbar');
  const menuCollapse = document.getElementById('menuCollapse');
  const toolbarDropdown = document.getElementById('toolbarDropdown');

  // localStorage key used to remember user's toolbar state
  const COLLAPSE_KEY = 'wb_toolbar_collapsed_v1';

  // =========================================================
  // CHANGE THIS VALUE to adjust auto-collapse breakpoint
  // Example: 768 for tablet-first, 1024 for desktop-first
  // =========================================================
  const AUTO_COLLAPSE_BREAKPOINT = 920;

  /**
   * Build the dropdown content by cloning elements that
   * have the "hide-when-collapsed" class in the toolbar.
   *
   * Important:
   * - We remove IDs from clones to avoid duplicate IDs.
   * - We wire the cloned controls to forward actions/values
   *   to the originals.
   */
  function buildDropdownContents() {
    // Clear previous dropdown DOM (fresh rebuild each time)
    toolbarDropdown.innerHTML = '';

    // Collect all elements hidden on collapse
    const hiddenGroups = document.querySelectorAll('.hide-when-collapsed');

    hiddenGroups.forEach(node => {
      // Clone the group section
      const copy = node.cloneNode(true);

      // Make sure clone is visible in dropdown
      copy.classList.remove('hide-when-collapsed');

      // Remove IDs from clone descendants to avoid duplicates
      copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

      // Add to dropdown container
      toolbarDropdown.appendChild(copy);
    });

    // Add a local "Close" button row (only affects dropdown)
    const bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.justifyContent = 'flex-end';
    bar.style.marginTop = '8px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'small';
    closeBtn.addEventListener('click', () => {
      hideDropdown();
    });

    bar.appendChild(closeBtn);
    toolbarDropdown.appendChild(bar);

    /**
     * WIRE CLONED BUTTONS
     * - Strategy: match by button text content and click original button.
     *
     * NOTE:
     * - If you create two toolbar buttons with same text,
     *   this might trigger the wrong one. If you ever face that,
     *   switch to matching by data attributes instead.
     */
    toolbarDropdown.querySelectorAll('button').forEach(btn => {
      if (btn === closeBtn) return; // skip our local Close
      btn.addEventListener('click', () => {
        const txt = btn.textContent.trim();
        const candidates = Array.from(toolbar.querySelectorAll('button'))
          .filter(b => b.textContent.trim() === txt);

        if (candidates.length) {
          candidates[0].click(); // trigger the first matching original
        }
      });
    });

    /**
     * WIRE CLONED INPUTS/SELECTS
     * - Strategy: match inputs by their position among "hidden controls".
     *
     * If you reorder controls in HTML, this still works as long as
     * the cloned order matches original order.
     *
     * If you add more controls and something mismatches:
     * - check this indexing logic
     * - or switch to data-* attribute matching.
     */
    const clonedInputs = toolbarDropdown.querySelectorAll('input,select');
    const originalInputs = Array.from(
      toolbar.querySelectorAll('input,select')
    ).filter(n =>
      n.classList.contains('hide-when-collapsed') ||
      n.closest('.hide-when-collapsed')
    );

    clonedInputs.forEach((input, idx) => {
      const original = originalInputs[idx];
      if (!original) return;

      function forwardValue() {
        // Copy dropdown value into original control
        original.value = input.value;

        // Fire events so original listeners run
        original.dispatchEvent(new Event('input', { bubbles: true }));
        original.dispatchEvent(new Event('change', { bubbles: true }));
      }

      input.addEventListener('input', forwardValue);
      input.addEventListener('change', forwardValue);
    });
  }

  /**
   * Apply collapsed state to toolbar and persist in localStorage.
   *
   * Change behavior:
   * - If you don't want persistence, remove localStorage calls.
   */
  function setCollapsedState(collapsed) {
    if (collapsed) {
      toolbar.classList.add('collapsed');
      localStorage.setItem(COLLAPSE_KEY, '1');
      menuCollapse.setAttribute('aria-expanded', 'false');
    } else {
      toolbar.classList.remove('collapsed');
      localStorage.removeItem(COLLAPSE_KEY);
      menuCollapse.setAttribute('aria-expanded', 'true');
      hideDropdown(); // hide dropdown when expanded
    }
  }

  /**
   * Show dropdown and build its contents fresh.
   * If you want dropdown to keep state between openings,
   * remove buildDropdownContents() call.
   */
  function showDropdown() {
    buildDropdownContents();
    toolbarDropdown.classList.add('show');
    toolbarDropdown.setAttribute('aria-hidden', 'false');
  }

  /**
   * Hide dropdown.
   */
  function hideDropdown() {
    toolbarDropdown.classList.remove('show');
    toolbarDropdown.setAttribute('aria-hidden', 'true');
  }

  /**
   * Auto-collapse based on screen width and saved preference.
   *
   * Current logic:
   * - If width <= breakpoint: ALWAYS collapsed
   * - Else: use saved preference (collapsed if saved, expanded otherwise)
   *
   * If you want "always expanded on desktop":
   * - remove saved preference logic in the else block.
   */
  function applyAutoCollapse() {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    const w = window.innerWidth;

    if (w <= AUTO_COLLAPSE_BREAKPOINT) {
      setCollapsedState(true);
    } else {
      if (saved) setCollapsedState(true);
      else setCollapsedState(false);
    }
  }

  // --------- Event Wiring ---------

  // Initial state on load
  applyAutoCollapse();

  // Re-check on window resize
  window.addEventListener('resize', applyAutoCollapse);

  /**
   * Menu button click:
   * - If collapsed -> expand
   * - If expanded -> collapse and immediately open dropdown
   *
   * If you want collapse to NOT open dropdown automatically:
   * - remove showDropdown() call.
   */
  menuCollapse.addEventListener('click', () => {
    const nowCollapsed = toolbar.classList.contains('collapsed');

    if (nowCollapsed) {
      // Expand toolbar
      setCollapsedState(false);
    } else {
      // Collapse toolbar + open dropdown
      setCollapsedState(true);
      showDropdown();
    }
  });

  /**
   * Close dropdown when clicking outside.
   * If you want dropdown to stay open until Close pressed:
   * - remove this listener.
   */
  document.addEventListener('click', ev => {
    if (!toolbarDropdown.contains(ev.target) &&
      !menuCollapse.contains(ev.target)) {
      hideDropdown();
    }
  });

  /**
   * Escape key closes dropdown.
   */
  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
      hideDropdown();
    }
  });
})();