(function () {
  const toolbar = document.getElementById('toolbar');
  const menu = document.getElementById('menuCollapse');
  const dropdown = document.getElementById('toolbarDropdown');

  menu.addEventListener('click', () => {
    toolbar.classList.toggle('collapsed');
  });
})();