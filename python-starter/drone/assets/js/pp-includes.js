(function () {
  async function includePartial(node) {
    const url = node.getAttribute('data-pp-include');
    if (!url) return;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      node.innerHTML = await res.text();
    } catch (err) {
      node.innerHTML = '';
      console.warn(`Could not load include ${url}:`, err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-pp-include]').forEach(includePartial);
  });
})();
