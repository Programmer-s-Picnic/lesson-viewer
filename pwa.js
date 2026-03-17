let deferredPrompt = null;

const STORAGE_KEYS = {
  dismissed: "pp_editor_install_dismissed_v1",
  installed: "pp_editor_install_done_v1",
};

function $(id) {
  return document.getElementById(id);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function wasDismissed() {
  return localStorage.getItem(STORAGE_KEYS.dismissed) === "1";
}

function markDismissed() {
  localStorage.setItem(STORAGE_KEYS.dismissed, "1");
}

function clearDismissed() {
  localStorage.removeItem(STORAGE_KEYS.dismissed);
}

function markInstalled() {
  localStorage.setItem(STORAGE_KEYS.installed, "1");
}

function wasInstalled() {
  return localStorage.getItem(STORAGE_KEYS.installed) === "1";
}

function showFab() {
  const fab = $("installAppBtn");
  if (!fab) return;
  fab.classList.add("show");
  fab.classList.add("pulse");
}

function hideFab() {
  const fab = $("installAppBtn");
  if (!fab) return;
  fab.classList.remove("show");
  fab.classList.remove("pulse");
}

function showToast() {
  const toast = $("installToast");
  if (!toast) return;
  toast.classList.add("show");
}

function hideToast() {
  const toast = $("installToast");
  if (!toast) return;
  toast.classList.remove("show");
}

async function triggerInstall() {
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;

  if (choice && choice.outcome === "accepted") {
    hideToast();
    hideFab();
    markInstalled();
  }

  deferredPrompt = null;
  return true;
}

function maybeShowInstallUI() {
  if (!deferredPrompt) return;
  if (isStandalone() || wasInstalled()) return;

  showFab();

  if (!wasDismissed()) {
    setTimeout(() => {
      if (!isStandalone() && deferredPrompt) showToast();
    }, 900);
  }
}

function bindInstallUI() {
  const fab = $("installAppBtn");
  const toastBtn = $("installToastBtn");
  const toastClose = $("installToastClose");

  if (fab) {
    fab.addEventListener("click", async () => {
      await triggerInstall();
    });
  }

  if (toastBtn) {
    toastBtn.addEventListener("click", async () => {
      await triggerInstall();
    });
  }

  if (toastClose) {
    toastClose.addEventListener("click", () => {
      hideToast();
      markDismissed();
    });
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  maybeShowInstallUI();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  hideFab();
  hideToast();
  markInstalled();
  clearDismissed();
  console.log("PWA installed");
});

document.addEventListener("DOMContentLoaded", () => {
  bindInstallUI();

  if (isStandalone()) {
    hideFab();
    hideToast();
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    });
  }
});