(function () {
  'use strict';

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Could not load include: ' + url);
    return response.text();
  }

  function executeScripts(container) {
    const scripts = Array.from(container.querySelectorAll('script'));
    for (const oldScript of scripts) {
      const newScript = document.createElement('script');
      for (const attr of oldScript.attributes) newScript.setAttribute(attr.name, attr.value);
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    }
  }

  async function loadHeadsection() {
    if (document.documentElement.dataset.ppHeadLoaded === '1') return;
    document.documentElement.dataset.ppHeadLoaded = '1';
    try {
      const html = await fetchText('/headsection.html');
      const template = document.createElement('template');
      template.innerHTML = html;
      const nodes = Array.from(template.content.childNodes);
      for (const node of nodes) document.head.appendChild(node.cloneNode(true));
      executeScripts(document.head);
    } catch (error) {
      console.warn(error.message);
    }
  }

  async function loadIncludes() {
    const slots = Array.from(document.querySelectorAll('[data-pp-include]'));
    for (const slot of slots) {
      const url = slot.getAttribute('data-pp-include');
      if (!url || slot.dataset.ppLoaded === '1') continue;
      slot.dataset.ppLoaded = '1';
      try {
        slot.innerHTML = await fetchText(url);
        executeScripts(slot);
      } catch (error) {
        slot.className = 'pp-include-error';
        slot.textContent = error.message;
        console.warn(error.message);
      }
    }
  }

  loadHeadsection();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIncludes);
  } else {
    loadIncludes();
  }
})();
