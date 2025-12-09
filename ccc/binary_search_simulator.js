// Binary Search Simulator for Programmer's Picnic
// Assumes a <canvas id="bsCanvas"> and the controls exist in the HTML.

let bsSteps = [];
let currentStepIndex = 0;

const canvas = document.getElementById("bsCanvas");
const ctx = canvas.getContext("2d");

const arrayInput = document.getElementById("arrayInput");
const targetInput = document.getElementById("targetInput");
const visualizeBtn = document.getElementById("visualizeBtn");
const prevStepBtn = document.getElementById("prevStepBtn");
const nextStepBtn = document.getElementById("nextStepBtn");
const stepInfo = document.getElementById("stepInfo");
const stepControls = document.getElementById("stepControls");
const messageBox = document.getElementById("message");
const logsdiv = document.getElementById("logsdiv");

function parseArray(input) {
    if (!input.trim()) return null;
    const parts = input.split(/[, ]+/).filter(Boolean);
    const nums = parts.map(Number);
    if (nums.some(isNaN)) return null;
    return nums;
}

function calculateBinarySearchSteps(arr, target) {
    const steps = [];
    let low = 0;
    let high = arr.length - 1;
    let found = false;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        let note = "";

        if (arr[mid] === target) {
            note = `mid=${mid},arr[mid] == target \u2192 Found!`;
            logsdiv.innerHTML = note + `<br>${logsdiv.innerHTML}`;

            steps.push({ arr: [...arr], low, mid, high, note, found: true });
            found = true;
            break;
        } else if (arr[mid] < target) {
            note = `mid=${mid}, arr[mid] = ${arr[mid]} is smaller than target ${target} \u2192 move right (low = mid + 1)`;
            logsdiv.innerHTML = note + `<br>${logsdiv.innerHTML}`;

            steps.push({ arr: [...arr], low, mid, high, note, found: false });
            low = mid + 1;
        } else {
            note = `mid=${mid}, arr[mid] = ${arr[mid]} is larger than target ${target} \u2192 move left (high = mid - 1)`;
            logsdiv.innerHTML = note + `<br>${logsdiv.innerHTML}`;


            steps.push({ arr: [...arr], low, mid, high, note, found: false });
            high = mid - 1;
        }
    }

    if (!found) {
        steps.push({
            arr: [...arr],
            low,
            mid: null,
            high,
            note: "low > high \u2192 target not found in array",
            found: false,
            notFound: true
        });
    }

    return steps;
}

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

    ctx.font = "18px system-ui";
    ctx.fillText("Array (current view):", marginX, 100);

    for (let i = 0; i < n; i++) {
        const x = startX + i * (boxW + gap);

        let fill = "#ffffff";
        if (step.notFound) {
            fill = "#f5f5f5";
        } else if (i === step.mid) {
            fill = "#ffe0b2";
        } else if (i >= step.low && i <= step.high) {
            fill = "#e3f2fd";
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

    if (step.low >= 0 && step.low < n && !step.notFound) {
        const xLow = startX + step.low * (boxW + gap) + boxW / 2;
        ctx.fillStyle = "#0000ff";
        ctx.fillText("low", xLow, y + boxH + 20);
    }
    if (step.mid !== null && step.mid >= 0 && step.mid < n && !step.notFound) {
        const xMid = startX + step.mid * (boxW + gap) + boxW / 2;
        ctx.fillStyle = "#ff0000";
        ctx.fillText("mid", xMid, y + boxH + 35);
    }
    if (step.high >= 0 && step.high < n && !step.notFound) {
        const xHigh = startX + step.high * (boxW + gap) + boxW / 2;
        ctx.fillStyle = "#009688";
        ctx.fillText("high", xHigh, y + boxH + 20);
    }

    if (step.found) {
        ctx.fillStyle = "#2e7d32";
        ctx.font = "20px system-ui";
        ctx.fillText("Target found here!", startX + (boxW + gap) * step.mid + boxW / 2, y - 15);
    } else if (step.notFound) {
        ctx.fillStyle = "#c62828";
        ctx.font = "18px system-ui";
        ctx.fillText("Target not found", canvas.width / 2, y - 15);
    }
}

function updateStepUI() {
    if (!bsSteps.length) {
        stepInfo.textContent = "Step 0/0";
        messageBox.innerHTML = "";

        logsdiv.innerHTML = stepInfo.textContent;
        // alert();
        return;
    }
    stepInfo.textContent = `Step ${currentStepIndex + 1}/${bsSteps.length}`;
    logsdiv.innerHTML = stepInfo.textContent + `<br>${logsdiv.innerHTML}`;

    const step = bsSteps[currentStepIndex];
    drawStep(step, targetInput.value ? Number(targetInput.value) : "?");

    const note = step.note || "";
    messageBox.innerHTML = `<span class="note">Explanation:</span> ${note}`;
    logsdiv.innerHTML = messageBox.innerHTML + `<br>${logsdiv.innerHTML}`;

}

visualizeBtn.addEventListener("click", () => {
    const arr = parseArray(arrayInput.value || "");
    const targetStr = targetInput.value;

    if (!arr || arr.length === 0) {
        alert("Please enter a valid sorted array (e.g. 3,6,11,14,18).");
        return;
    }
    if (targetStr.trim() === "" || isNaN(Number(targetStr))) {
        alert("Please enter a valid numeric target.");
        return;
    }

    const target = Number(targetStr);
    bsSteps = calculateBinarySearchSteps(arr, target);
    if (!bsSteps.length) {
        alert("No steps generated. Check the input.");
        return;
    }

    currentStepIndex = 0;
    stepControls.style.display = "flex";
    logsdiv.innerHTML = "";
    updateStepUI();
});

prevStepBtn.addEventListener("click", () => {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        updateStepUI();
    }
});

nextStepBtn.addEventListener("click", () => {
    if (currentStepIndex < bsSteps.length - 1) {
        currentStepIndex++;
        updateStepUI();
    }
});

clearCanvas();
ctx.font = "18px system-ui";
ctx.fillStyle = "#999";
ctx.textAlign = "center";
ctx.fillText("Enter a sorted array and target above, then click \"Visualize Binary Search\".", canvas.width / 2, canvas.height / 2);


