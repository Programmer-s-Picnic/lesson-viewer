  
    (function toolbarModule() {
      const toolbar = document.getElementById('toolbar');
      const menuCollapse = document.getElementById('menuCollapse');
      const toolbarDropdown = document.getElementById('toolbarDropdown');

      const COLLAPSE_KEY = 'wb_toolbar_collapsed_v1';
      const AUTO_COLLAPSE_BREAKPOINT = 920;

      /**
       * Build the dropdown content by cloning elements that
       * have the "hide-when-collapsed" class in the toolbar.
       *
       * Important: We remove IDs from clones to avoid duplicate IDs.
       * We also wire the dropdown controls to forward actions to
       * the original toolbar controls.
       */
      function buildDropdownContents() {
        toolbarDropdown.innerHTML = '';

        // Collect all elements that are hidden when the toolbar collapses
        const hiddenGroups = document.querySelectorAll('.hide-when-collapsed');

        hiddenGroups.forEach(node => {
          const copy = node.cloneNode(true);
          // This copy should be visible inside dropdown
          copy.classList.remove('hide-when-collapsed');

          // Remove IDs from all descendants to avoid conflicts
          copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));

          toolbarDropdown.appendChild(copy);
        });

        // Add a small "Close" row at the bottom
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

        // Wire cloned buttons: by text content, trigger original toolbar button
        toolbarDropdown.querySelectorAll('button').forEach(btn => {
          if (btn === closeBtn) return; // skip our local Close
          btn.addEventListener('click', () => {
            const txt = btn.textContent.trim();
            const candidates = Array.from(toolbar.querySelectorAll('button'))
              .filter(b => b.textContent.trim() === txt);
            if (candidates.length) {
              candidates[0].click();
            }
          });
        });

        // Wire cloned inputs/selects: match by position among "hidden" controls
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
            original.value = input.value;
            original.dispatchEvent(new Event('input', { bubbles: true }));
            original.dispatchEvent(new Event('change', { bubbles: true }));
          }

          input.addEventListener('input', forwardValue);
          input.addEventListener('change', forwardValue);
        });
      }

      /**
       * Helper: apply collapsed state to toolbar + persist in localStorage.
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

      /**
       * Show dropdown (build contents fresh so it reflects current state).
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
       * Apply auto-collapse behavior depending on window width
       * and saved user preference.
       */
      function applyAutoCollapse() {
        const saved = localStorage.getItem(COLLAPSE_KEY);
        const w = window.innerWidth;

        if (w <= AUTO_COLLAPSE_BREAKPOINT) {
          // On small screens, always collapsed
          setCollapsedState(true);
        } else {
          // On larger screens, respect saved state (if any)
          if (saved) {
            setCollapsedState(true);
          } else {
            setCollapsedState(false);
          }
        }
      }

      // --------- Event Wiring ---------

      // Initial state
      applyAutoCollapse();

      // Window resize: re-check auto collapse
      window.addEventListener('resize', applyAutoCollapse);

      // Menu button click: toggle collapsed; when collapsed, also toggle dropdown
      menuCollapse.addEventListener('click', () => {
        const nowCollapsed = toolbar.classList.contains('collapsed');

        if (nowCollapsed) {
          // Expand toolbar (desktop style)
          setCollapsedState(false);
        } else {
          // Collapse toolbar and open dropdown immediately
          setCollapsedState(true);
          showDropdown();
        }
      });

      // Clicking outside dropdown closes it
      document.addEventListener('click', ev => {
        if (!toolbarDropdown.contains(ev.target) &&
          !menuCollapse.contains(ev.target)) {
          hideDropdown();
        }
      });

      // Escape key also closes dropdown
      window.addEventListener('keydown', ev => {
        if (ev.key === 'Escape') {
          hideDropdown();
        }
      });
    })();
   
