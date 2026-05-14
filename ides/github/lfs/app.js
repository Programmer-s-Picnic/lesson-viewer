(() => {
  "use strict";

  const storageKey = "pp_git_lfs_lesson_checks";
  const themeKey = "pp_git_lfs_theme";
  const checks = JSON.parse(localStorage.getItem(storageKey) || "{}");

  document.querySelectorAll("[data-check]").forEach((box) => {
    const id = box.dataset.check;
    box.checked = Boolean(checks[id]);
    box.addEventListener("change", () => {
      checks[id] = box.checked;
      localStorage.setItem(storageKey, JSON.stringify(checks));
    });
  });

  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.parentElement.querySelector("code").innerText;
      try {
        await navigator.clipboard.writeText(code);
        const old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = old), 900);
      } catch {
        btn.textContent = "Select text";
      }
    });
  });

  const themeBtn = document.getElementById("themeBtn");
  if (localStorage.getItem(themeKey) === "dark") {
    document.body.classList.add("dark");
    themeBtn.textContent = "Light mode";
  }

  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem(themeKey, isDark ? "dark" : "light");
    themeBtn.textContent = isDark ? "Light mode" : "Dark mode";
  });

  document.getElementById("progressBtn").addEventListener("click", () => {
    const all = document.querySelectorAll("[data-check]").length;
    const done = document.querySelectorAll("[data-check]:checked").length;
    alert(`Git LFS lesson progress: ${done}/${all} checkpoints complete.`);
  });

  const quizResult = document.getElementById("quizResult");
  let correct = 0;
  let attempted = 0;

  document.querySelectorAll(".quiz button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.parentElement;
      if (group.dataset.done === "yes") return;

      attempted += 1;
      group.dataset.done = "yes";

      if (btn.dataset.answer === "correct") {
        correct += 1;
        btn.classList.add("correct");
      } else {
        btn.classList.add("wrong");
        const right = group.querySelector('[data-answer="correct"]');
        if (right) right.classList.add("correct");
      }

      quizResult.textContent = `Score: ${correct}/${attempted}`;
    });
  });

  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.info("AdSense not loaded yet.", e);
  }
})();
