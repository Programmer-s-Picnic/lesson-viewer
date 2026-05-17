function activateCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const code = button.nextElementSibling.innerText;

      try {
        await navigator.clipboard.writeText(code);
        const oldText = button.innerText;
        button.innerText = "Copied";
        setTimeout(() => {
          button.innerText = oldText;
        }, 1200);
      } catch (error) {
        alert("Copy failed. Please select and copy manually.");
      }
    });
  });
}

function activateCheckpoints() {
  document.querySelectorAll(".checkpoint").forEach((checkpoint) => {
    const boxes = checkpoint.querySelectorAll('input[type="checkbox"]');
    const button = checkpoint.querySelector(".checkpoint-continue");
    const status = checkpoint.querySelector(".checkpoint-status");

    if (!button || !status) {
      return;
    }

    function updateState() {
      const allDone = Array.from(boxes).every((box) => box.checked);
      button.disabled = !allDone;
      status.textContent = allDone
        ? "Good. You can continue."
        : "Complete all checks to continue.";
    }

    boxes.forEach((box) => box.addEventListener("change", updateState));

    button.addEventListener("click", () => {
      const section = checkpoint.closest("section.lesson");
      const nextSection = section ? section.nextElementSibling : null;

      if (nextSection) {
        nextSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });

    updateState();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  activateCopyButtons();
  activateCheckpoints();
});
