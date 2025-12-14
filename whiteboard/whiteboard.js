(function toolbarModule() {
  const toolbar = document.getElementById('toolbar');
  const menuCollapse = document.getElementById('menuCollapse');
  const toolbarDropdown = document.getElementById('toolbarDropdown');

  const COLLAPSE_KEY = 'wb_toolbar_collapsed_v1';
  const AUTO_COLLAPSE_BREAKPOINT = 920;

  function buildDropdownContents() {
    toolbarDropdown.innerHTML = '';

    const hiddenGroups = document.querySelectorAll('.hide-when-collapsed');

    hiddenGroups.forEach(node => {
      const copy = node.cloneNode(true);
      copy.classList.remove('hide-when-collapsed');
      copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      toolbarDropdown.appendChild(copy);
    });

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

    toolbarDropdown.querySelectorAll('button').forEach(btn => {
      if (btn === closeBtn) return;
      btn.addEventListener('click', () => {
        const txt = btn.textContent.trim();
        const candidates = Array.from(toolbar.querySelectorAll('button'))
          .filter(b => b.textContent.trim() === txt);
        if (candidates.length) candidates[0].click();
      });
    });

    const clonedInputs = toolbarDropdown.querySelectorAll('input,select');
    const originalInputs = Array.from(toolbar.querySelectorAll('input,select'))
      .filter(n => n.classList.contains('hide-when-collapsed') || n.closest('.hide-when-collapsed'));

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

  function applyAutoCollapse() {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    const w = window.innerWidth;
    if (w <= AUTO_COLLAPSE_BREAKPOINT) setCollapsedState(true);
    else setCollapsedState(!!saved);
  }

  applyAutoCollapse();
  window.addEventListener('resize', applyAutoCollapse);

  menuCollapse.addEventListener('click', () => {
    const nowCollapsed = toolbar.classList.contains('collapsed');
    if (nowCollapsed) {
      setCollapsedState(false);
    } else {
      setCollapsedState(true);
      showDropdown();
    }
  });

  document.addEventListener('click', ev => {
    if (!toolbarDropdown.contains(ev.target) && !menuCollapse.contains(ev.target)) {
      hideDropdown();
    }
  });

  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') hideDropdown();
  });
})();
