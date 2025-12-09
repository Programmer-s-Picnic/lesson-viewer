// Search Simulator – Programmer's Picnic
// Binary + Linear search with auto-play, sound, logs & exports.

let steps = [];
let currentStepIndex = 0;

const canvas = document.getElementById("bsCanvas");
const ctx = canvas.getContext("2d");

const arrayInput = document.getElementById("arrayInput");
const targetInput = document.getElementById("targetInput");
const algoSelect = document.getElementById("algoSelect");

const visualizeBtn = document.getElementById("visualizeBtn");
const prevStepBtn = document.getElementById("prevStepBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const autoPlayBtn = document.getElementById("autoPlayBtn");
const speedRange = document.getElementById("speedRange");
const soundToggle = document.getElementById("soundToggle");

const stepInfo = document.getElementById("stepInfo");
const stepControls = document.getElementById("stepControls");
const messageBox = document.getElementById("message");
const logsdiv = document.getElementById("logsdiv");
const exportTxtBtn = document.getElementById("exportTxtBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// Audio (tick) setup
let audioCtx = null;
let audioEnabled = true;

function playTick() {
    if (!audioEnabled) return;
    try {
        if (!audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = 900;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.1);
    } catch (e) {
        // ignore audio failures
    }
}

// Auto play
let autoPlay = false;
let autoPlayTimer = null;

function getSpeed() {
    const v = Number(speedRange.value);
    return isNaN(v) ? 800 : v;
}

function stopAutoPlay() {
    autoPlay = false;
    autoPlayBtn.textContent = "▶ Auto Play";
    if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
        autoPlayTimer = null;
    }
}

function startAutoPlay() {
    if (!steps.length) return;
    if (autoPlay) return;
    autoPlay = true;
    autoPlayBtn.textContent = "⏸ Pause";

    const run = () => {
        if (!autoPlay) {
            autoPlayTimer = null;
            return;
        }
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            updateStepUI();
            autoPlayTimer = setTimeout(run, getSpeed());
        } else {
            stopAutoPlay();
        }
    };

    autoPlayTimer = setTimeout(run, getSpeed());
}

// Parsing
function parseArray(input) {
    if (!input.trim()) return null;
    const parts = input.split(/[, ]+/).filter(Boolean);
    const nums = parts.map(Number);
    if (nums.some(isNaN)) return null;
    return nums;
}

// Binary Search
function calculateBinarySearchSteps(arr, target) {
    const result = [];
    let low = 0;
    let high = arr.length - 1;
    let found = false;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        let note;

        if (arr[mid] === target) {
            note = `Binary: mid=${mid}, arr[mid] == ${target} → Found!`;
            result.push({ algo: "binary", arr: [...arr], low, mid, high, note, found: true });
            found = true;
            break;
        } else if (arr[mid] < target) {
            note = `Binary: mid=${mid}, arr[mid] = ${arr[mid]} < ${target} → move right (low = mid + 1)`;
            result.push({ algo: "binary", arr: [...arr], low, mid, high, note, found: false });
            low = mid + 1;
        } else {
            note = `Binary: mid=${mid}, arr[mid] = ${arr[mid]} > ${target} → move left (high = mid - 1)`;
            result.push({ algo: "binary", arr: [...arr], low, mid, high, note, found: false });
            high = mid - 1;
        }
    }

    if (!found) {
        result.push({
            algo: "binary",
            arr: [...arr],
            low,
            mid: null,
            high,
            note: "Binary: low > high → target not found in array",
            found: false,
            notFound: true
        });
    }

    return result;
}

// Linear Search
function calculateLinearSearchSteps(arr, target) {
    const result = [];
    let found = false;

    for (let i = 0; i < arr.length; i++) {
        let note;
        if (arr[i] === target) {
            note = `Linear: i=${i}, arr[i] == ${target} → Found!`;
            result.push({
                algo: "linear",
                arr: [...arr],
                low: 0,
                mid: i,
                high: arr.length - 1,
                note,
                found: true
            });
            found = true;
            break;
        } else {
            note = `Linear: i=${i}, arr[i] = ${arr[i]} ≠ ${target} → continue`;
            result.push({
                algo: "linear",
                arr: [...arr],
                low: 0,
                mid: i,
                high: arr.length - 1,
                note,
                found: false
            });
        }
    }

    if (!found) {
        result.push({
            algo: "linear",
            arr: [...arr],
            low: 0,
            mid: null,
            high: arr.length - 1,
            note: "Linear: reached end of array → target not found",
            found: false,
            notFound: true
        });
    }

    return result;
}

// Canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawStep(step, target) {
    clearCanvas();
    if (!step) return;

    const arr = step.arr;
    const n = arr.length;

    const marginX = 40;
    const boxW = Math.max(40, Math.min(70, (canvas.width - marginX * 2) / Math.max(n, 1) - 5));
    const boxH = 50;
    const gap = 5;
    const startX = (canvas.width - (n * boxW + (n - 1) * gap)) / 2;
    const y = 160;

    ctx.font = "16px system-ui";
    ctx.fillStyle = "#000";
    ctx.textAlign = "left";
    ctx.fillText(`Target = ${target}`, marginX, 60);
    ctx.fillText(`Algorithm: ${step.algo === "binary" ? "Binary Search" : "Linear Search"}`, marginX, 80);

    ctx.font = "18px system-ui";
    ctx.fillText("Array (current view):", marginX, 110);

    for (let i = 0; i < n; i++) {
        const x = startX + i * (boxW + gap);
        let fill = "#ffffff";

        if (step.notFound) {
            fill = "#f5f5f5";
        } else if (step.algo === "binary") {
            if (i === step.mid) {
                fill = "#ffe0b2";
            } else if (i >= step.low && i <= step.high) {
                fill = "#e3f2fd";
            }
        } else if (step.algo === "linear") {
            if (i === step.mid) {
                fill = "#ffe0b2";
            }
        }

        ctx.fillStyle = fill;
        ctx.fillRect(x, y, boxW, boxH);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, boxW, boxH);

        ctx.fillStyle = "#000";
        ctx.font = "18px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(String(arr[i]), x + boxW / 2, y + boxH / 2);
        ctx.font = "12px system-ui";
        ctx.fillText(String(i), x + boxW / 2, y + boxH - 8);
    }

    ctx.textAlign = "center";
    ctx.font = "14px system-ui";

    if (step.algo === "binary") {
        if (step.low >= 0 && step.low < n && !step.notFound) {
            const xLow = startX + step.low * (boxW + gap) + boxW / 2;
            ctx.fillStyle = "#0077cc";
            ctx.fillText("low", xLow, y + boxH + 20);
        }
        if (step.mid !== null && step.mid >= 0 && step.mid < n && !step.notFound) {
            const xMid = startX + step.mid * (boxW + gap) + boxW / 2;
            ctx.fillStyle = "#cc0000";
            ctx.fillText("mid", xMid, y + boxH + 35);
        }
        if (step.high >= 0 && step.high < n && !step.notFound) {
            const xHigh = startX + step.high * (boxW + gap) + boxW / 2;
            ctx.fillStyle = "#009688";
            ctx.fillText("high", xHigh, y + boxH + 20);
        }
    } else if (step.algo === "linear") {
        if (step.mid !== null && step.mid >= 0 && step.mid < n && !step.notFound) {
            const xMid = startX + step.mid * (boxW + gap) + boxW / 2;
            ctx.fillStyle = "#cc0000";
            ctx.fillText("i", xMid, y + boxH + 25);
        }
    }

    if (step.found) {
        ctx.fillStyle = "#2e7d32";
        ctx.font = "20px system-ui";
        ctx.fillText("Target found!", canvas.width / 2, y - 20);
    } else if (step.notFound) {
        ctx.fillStyle = "#c62828";
        ctx.font = "18px system-ui";
        ctx.fillText("Target not found", canvas.width / 2, y - 20);
    }
}

// Logs
function clearLogs() {
    logsdiv.innerHTML = `
        <div><strong>Binary / Linear Search Trace Logs</strong></div>
        <div style="font-size:0.8rem; opacity:0.8;">Each step recorded below:</div>
        <br>
    `;
}

function rebuildLogs(upToIndex) {
    // rebuild logs from step 0..upToIndex
    for (let i = 0; i <= upToIndex; i++) {
        const step = steps[i];
        const entry = document.createElement("div");
        entry.className = "log-entry" + (i === upToIndex ? " active" : "");

        let idxLabel;
        if (step.algo === "binary") {
            idxLabel = `low=${step.low}, mid=${step.mid}, high=${step.high}`;
        } else {
            idxLabel = `i=${step.mid}`;
        }

        entry.innerHTML =
            `<span class="label">${step.algo === "binary" ? "Binary" : "Linear"}:</span> ` +
            `<span class="idx">${idxLabel}</span> → ` +
            `<span>${step.note}</span>`;

        logsdiv.appendChild(entry);
    }

    logsdiv.scrollTop = logsdiv.scrollHeight;
}

// UI update
function updateStepUI() {
    if (!steps.length) {
        stepInfo.textContent = "Step 0/0";
        messageBox.innerHTML = "";
        clearLogs();
        return;
    }

    const step = steps[currentStepIndex];

    stepInfo.textContent = `Step ${currentStepIndex + 1}/${steps.length}`;
    drawStep(step, targetInput.value ? Number(targetInput.value) : "?");

    const note = step.note || "";
    messageBox.innerHTML = `<span class="note">Explanation:</span> ${note}`;

    clearLogs();
    rebuildLogs(currentStepIndex);

    playTick();
}

// Exports
function exportLogsTxt() {
    const text = logsdiv.innerText || "";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const algoLabel = algoSelect.value === "binary" ? "binary" : "linear";
    a.href = url;
    a.download = `search_logs_${algoLabel}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportLogsPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    const safeText = (logsdiv.innerText || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    w.document.write(`
        <html>
        <head>
            <title>Search Logs – Programmer's Picnic</title>
        </head>
        <body>
            <h2>Search Logs – Programmer's Picnic</h2>
            <pre style="font-family:monospace; white-space:pre-wrap;">${safeText}</pre>
        </body>
        </html>
    `);
    w.document.close();
    w.focus();
    w.print(); // user can Save as PDF from print dialog
}

// Events
visualizeBtn.addEventListener("click", () => {
    const arr = parseArray(arrayInput.value || "");
    const targetStr = targetInput.value;

    stopAutoPlay();

    if (!arr || arr.length === 0) {
        alert("Please enter a valid sorted array (e.g. 3,6,11,14,18).");
        return;
    }
    if (targetStr.trim() === "" || isNaN(Number(targetStr))) {
        alert("Please enter a valid numeric target.");
        return;
    }

    const target = Number(targetStr);
    const algo = algoSelect.value;

    if (algo === "binary") {
        steps = calculateBinarySearchSteps(arr, target);
    } else {
        steps = calculateLinearSearchSteps(arr, target);
    }

    if (!steps.length) {
        alert("No steps generated. Check the input.");
        return;
    }

    currentStepIndex = 0;
    stepControls.style.display = "flex";
    clearLogs();
    updateStepUI();
});

prevStepBtn.addEventListener("click", () => {
    if (currentStepIndex > 0) {
        stopAutoPlay();
        currentStepIndex--;
        updateStepUI();
    }
});

nextStepBtn.addEventListener("click", () => {
    if (currentStepIndex < steps.length - 1) {
        stopAutoPlay();
        currentStepIndex++;
        updateStepUI();
    }
});

autoPlayBtn.addEventListener("click", () => {
    if (autoPlay) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
});

soundToggle.addEventListener("change", () => {
    audioEnabled = soundToggle.checked;
});

exportTxtBtn.addEventListener("click", exportLogsTxt);
exportPdfBtn.addEventListener("click", exportLogsPdf);

// Initial canvas text
clearCanvas();
ctx.font = "18px system-ui";
ctx.fillStyle = "#999";
ctx.textAlign = "center";
ctx.fillText(
    "Enter a sorted array, choose method, set target, then click \"Visualize\".",
    canvas.width / 2,
    canvas.height / 2
);

// Initial logs header
clearLogs();