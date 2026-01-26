/**
 * ============================================================
 * TOOLBAR MODULE
 * ============================================================
 * Purpose:
 * - Allows collapsing the toolbar on small screens (or user choice)
 * - When collapsed, creates a dropdown with cloned controls
 *
 * "CHANGE THIS -> DO THIS" GUIDE:
 * - Change breakpoint where it auto-collapses:
 *     AUTO_COLLAPSE_BREAKPOINT = 920;
 * - Change storage key (to reset for all users):
 *     COLLAPSE_KEY = 'wb_toolbar_collapsed_v1';
 * - Improve dropdown mapping: currently matches button text.
 *   If you rename button text, dropdown click forwarding may fail.
 *   Fix: forward by data-action attributes instead (recommended).
 */

(function toolbarModule() {
  // Main toolbar DOM nodes
  const toolbar = document.getElementById('toolbar');
  const menuCollapse = document.getElementById('menuCollapse');
  const toolbarDropdown = document.getElementById('toolbarDropdown');

  // Persisted preference
  const COLLAPSE_KEY = 'wb_toolbar_collapsed_v1';

  // Auto-collapse on smaller screens
  const AUTO_COLLAPSE_BREAKPOINT = 920;

  /**
   * Build dropdown contents by cloning all nodes that are hidden when collapsed.
   * Those nodes have the class "hide-when-collapsed".
   *
   * IMPORTANT:
   * - We remove IDs from clones to avoid duplicate IDs in DOM.
   * - For buttons: we forward clicks to original buttons.
   * - For inputs/selects: we forward value changes to originals.
   */
  function buildDropdownContents() {
    toolbarDropdown.innerHTML = '';

    // Grab all groups that disappear in collapsed mode
    const hiddenGroups = document.querySelectorAll('.hide-when-collapsed');

    hiddenGroups.forEach(node => {
      // Clone the entire group
      const copy = node.cloneNode(true);

      // Make it visible in dropdown (remove the hiding class)
      copy.classList.remove('hide-when-collapsed');

      // Remove IDs inside clones to prevent duplicate ID collisions
      copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

      toolbarDropdown.appendChild(copy);
    });

    // Add a small "Close" button at bottom of dropdown
    const bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.justifyContent = 'flex-end';
    bar.style.marginTop = '8px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'small';
    closeBtn.addEventListener('click', () => hideDropdown());

    bar.appendChild(closeBtn);
    toolbarDropdown.appendChild(bar);

    /**
     * ============================================================
     * Button forwarding logic
     * ============================================================
     * Current behavior:
     * - Finds original buttons by matching textContent.
     *
     * CHANGE THIS -> DO THIS (Recommended):
     * - Add data-action="addRect" to each original button and clone it.
     * - Then forward by matching data-action instead of text.
     */
    toolbarDropdown.querySelectorAll('button').forEach(btn => {
      if (btn === closeBtn) return;

      btn.addEventListener('click', () => {
        const txt = btn.textContent.trim();

        // Forward to original toolbar button with same text
        // WARNING: if you rename button text, forwarding can break.
        const candidates = Array.from(toolbar.querySelectorAll('button'))
          .filter(b => b.textContent.trim() === txt);

        if (candidates.length) candidates[0].click();
      });
    });

    /**
     * ============================================================
     * Input/select forwarding
     * ============================================================
     * We map cloned inputs to original inputs by index order.
     * This is generally okay if the structure is stable.
     *
     * CHANGE THIS -> DO THIS:
     * - Want more reliability? Add data-bind="penSize" etc.
     *   and map by that attribute.
     */
    const clonedInputs = toolbarDropdown.querySelectorAll('input,select');

    const originalInputs = Array.from(toolbar.querySelectorAll('input,select'))
      .filter(n => n.classList.contains('hide-when-collapsed') || n.closest('.hide-when-collapsed'));

    clonedInputs.forEach((input, idx) => {
      const original = originalInputs[idx];
      if (!original) return;

      function forwardValue() {
        // Copy value to the original input and trigger listeners
        original.value = input.value;
        original.dispatchEvent(new Event('input', { bubbles: true }));
        original.dispatchEvent(new Event('change', { bubbles: true }));
      }

      input.addEventListener('input', forwardValue);
      input.addEventListener('change', forwardValue);
    });
  }

  /**
   * Set toolbar collapsed state and persist it.
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
      hideDropdown();
    }
  }

  function showDropdown() {
    buildDropdownContents();
    toolbarDropdown.classList.add('show');
    toolbarDropdown.setAttribute('aria-hidden', 'false');
  }

  function hideDropdown() {
    toolbarDropdown.classList.remove('show');
    toolbarDropdown.setAttribute('aria-hidden', 'true');
  }

  /**
   * Auto-collapse logic:
   * - Collapses on small screens, expands on large screens unless user saved collapse.
   *
   * CHANGE THIS -> DO THIS:
   * - Want "always honor user preference" and never auto-force?
   *   remove the breakpoint logic and rely only on localStorage.
   */
  function applyAutoCollapse() {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    const w = window.innerWidth;

    if (w <= AUTO_COLLAPSE_BREAKPOINT) setCollapsedState(true);
    else setCollapsedState(!!saved);
  }

  // Init
  applyAutoCollapse();
  window.addEventListener('resize', applyAutoCollapse);

  // Toggle action
  menuCollapse.addEventListener('click', () => {
    const nowCollapsed = toolbar.classList.contains('collapsed');

    if (nowCollapsed) {
      setCollapsedState(false);
    } else {
      setCollapsedState(true);
      showDropdown();
    }
  });

  // Close dropdown if you click outside
  document.addEventListener('click', ev => {
    if (!toolbarDropdown.contains(ev.target) && !menuCollapse.contains(ev.target)) {
      hideDropdown();
    }
  });

  // Escape closes dropdown
  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') hideDropdown();
  });
})();
