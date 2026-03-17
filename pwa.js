let deferredPrompt = null;

function showInstallButton() {
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.style.display = "inline-flex";
}

function hideInstallButton() {
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.style.display = "none";
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  showInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  hideInstallButton();
  console.log("PWA installed");
});

document.addEventListener("DOMContentLoaded", () => {
  const installBtn = document.getElementById("installAppBtn");

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      console.log("Install choice:", choice && choice.outcome);

      deferredPrompt = null;
      hideInstallButton();
    });
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