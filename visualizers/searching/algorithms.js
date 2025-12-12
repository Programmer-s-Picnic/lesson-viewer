// algorithms.js
// Defines LS / BS-Iterative / BS-Recursive and wires up UI + engine.

// ----------------------------------------------------------
// Code snippets for each algorithm (for the code panel)
// ----------------------------------------------------------
const linearCode = [
    "for i in range(len(arr)):",
    "    if arr[i] == target:",
    "        return i",
    "return -1"
].join("\n");

const iterativeCode = [
    "low = 0",
    "high = len(arr) - 1",
    "",
    "while low <= high:",
    "    mid = (low + high) // 2",
    "    if arr[mid] == target:",
    "        return mid",
    "    elif target < arr[mid]:",
    "        high = mid - 1",
    "    else:",
    "        low = mid + 1",
    "",
    "return -1"
].join("\n");

const recursiveCode = [
    "def bs_rec(arr, low, high, target):",
    "    if low > high:",
    "        return -1",
    "",
    "    mid = (low + high) // 2",
    "",
    "    if arr[mid] == target:",
    "        return mid",
    "    elif target < arr[mid]:",
    "        return bs_rec(arr, low, mid-1, target)",
    "    else:",
    "        return bs_rec(arr, mid+1, high, target)"
].join("\n");

// ----------------------------------------------------------
// STEP GENERATORS
// ----------------------------------------------------------

// 1) Linear Search
function generateLinearSearchSteps(arr, target) {
    const steps = [];

    steps.push({
        label: "Start",
        description: "Begin scanning array from index 0.",
        pointers: { current: 0 },
        highlightLines: [1]
    });

    for (let i = 0; i < arr.length; i++) {
        steps.push({
            label: `Check index ${i}`,
            description: `Compare arr[${i}] = ${arr[i]} with target = ${target}.`,
            activeIndex: i,
            compareIndex: i,
            pointers: { current: i },
            highlightLines: [1, 2]
        });

        if (arr[i] === target) {
            steps.push({
                label: "FOUND",
                description: `Target ${target} found at index ${i}.`,
                foundIndex: i,
                pointers: { current: i },
                highlightLines: [3, 4]
            });
            return steps;
        }
    }

    steps.push({
        label: "Not Found",
        description: "Reached the end of the array. Target not present.",
        highlightLines: [5]
    });

    return steps;
}

// 2) Binary Search (Iterative)
function generateBinarySearchSteps(arr, target) {
    const steps = [];
    let low = 0;
    let high = arr.length - 1;

    steps.push({
        label: "Start",
        description: "Binary Search begins on sorted array.",
        pointers: { low, high },
        keepRange: [low, high],          // current active interval
        highlightLines: [1, 2, 3]
    });

    let stepNumber = 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);

        steps.push({
            label: `Step ${stepNumber}: mid=${mid}`,
            description: `mid = floor((${low} + ${high}) / 2) = ${mid}`,
            activeIndex: mid,
            pointers: { low, mid, high },
            keepRange: [low, high],      // still searching in [low, high]
            highlightLines: [4, 5]
        });

        if (arr[mid] === target) {
            steps.push({
                label: "FOUND",
                description: `arr[${mid}] = ${arr[mid]} equals target ${target}.`,
                foundIndex: mid,
                pointers: { low, mid, high },
                keepRange: [mid, mid],    // we “keep” exactly the found cell
                highlightLines: [6, 7]
            });
            return steps;
        }

        if (target < arr[mid]) {
            // We will KEEP the LEFT half [low, mid-1]
            // and DISCARD the RIGHT half [mid, high]
            steps.push({
                label: "Go Left",
                description: `${target} < ${arr[mid]} → high = mid - 1`,
                compareIndex: mid,
                pointers: { low, mid, high },
                keepRange: [low, mid - 1],   // selected half for next search
                dropRange: [mid, high],      // discarded half
                highlightLines: [8, 9]
            });
            high = mid - 1;
        } else {
            // We will KEEP the RIGHT half [mid+1, high]
            // and DISCARD the LEFT half [low, mid]
            steps.push({
                label: "Go Right",
                description: `${target} > ${arr[mid]} → low = mid + 1`,
                compareIndex: mid,
                pointers: { low, mid, high },
                keepRange: [mid + 1, high],  // selected half for next search
                dropRange: [low, mid],       // discarded half
                highlightLines: [10, 11]
            });
            low = mid + 1;
        }

        stepNumber++;
    }

    steps.push({
        label: "Not Found",
        description: "low > high ⇒ empty interval ⇒ target not found.",
        dropRange: [0, arr.length - 1],     // everything is effectively discarded
        highlightLines: [12]
    });

    return steps;
}

// 3) Binary Search (Recursive)
function generateRecursiveBinarySteps(arr, target) {
    const steps = [];
    let callId = 0;

    function recurse(low, high, depth) {
        callId++;

        steps.push({
            label: `Call ${callId}: search(${low}, ${high})`,
            description: `Entering recursive call at depth ${depth}.`,
            pointers: { low, high },
            depth,
            keepRange: [low, high],
            highlightLines: [1, 2, 3]
        });

        if (low > high) {
            steps.push({
                label: `Call ${callId}: Base Case`,
                description: "low > high ⇒ return -1 (not found).",
                depth,
                dropRange: [low, high],
                highlightLines: [11]
            });
            return;
        }

        const mid = Math.floor((low + high) / 2);

        steps.push({
            label: `Call ${callId}: mid=${mid}`,
            description: `mid = floor((${low} + ${high}) / 2) = ${mid}.`,
            activeIndex: mid,
            pointers: { low, mid, high },
            depth,
            keepRange: [low, high],
            highlightLines: [4, 5]
        });

        if (arr[mid] === target) {
            steps.push({
                label: `FOUND at depth ${depth}`,
                description: `arr[${mid}] = ${arr[mid]} equals target ${target}.`,
                foundIndex: mid,
                depth,
                keepRange: [mid, mid],
                highlightLines: [6, 7]
            });
            return;
        }

        if (target < arr[mid]) {
            steps.push({
                label: "Recurse Left",
                description: `${target} < ${arr[mid]} ⇒ recurse on left half.`,
                compareIndex: mid,
                depth,
                keepRange: [low, mid - 1],
                dropRange: [mid, high],
                highlightLines: [8]
            });
            recurse(low, mid - 1, depth + 1);
        } else {
            steps.push({
                label: "Recurse Right",
                description: `${target} > ${arr[mid]} ⇒ recurse on right half.`,
                compareIndex: mid,
                depth,
                keepRange: [mid + 1, high],
                dropRange: [low, mid],
                highlightLines: [9, 10]
            });
            recurse(mid + 1, high, depth + 1);
        }
    }

    recurse(0, arr.length - 1, 0);
    return steps;
}

// ----------------------------------------------------------
// Wiring everything together
// ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
    const arrayInput = document.getElementById("pp-vis-input-array");
    const targetInput = document.getElementById("pp-vis-input-target");
    const applyBtn = document.getElementById("pp-vis-btn-apply");
    const modeButtons = document.querySelectorAll(".pp-vis-mode-buttons .pp-vis-btn");

    let currentMode = "linear";

    const VISUALIZERS = {
        linear: {
            title: "Linear Search Visualizer",
            subtitle: "Simple scan from left to right.",
            code: linearCode,
            generator: function (arr, target) {
                // Linear search uses array as-is
                return generateLinearSearchSteps(arr, target);
            }
        },
        bs_iter: {
            title: "Binary Search Visualizer (Iterative)",
            subtitle: "Binary Search with a while-loop on a sorted array.",
            code: iterativeCode,
            generator: function (arr, target) {
                const sorted = arr.slice().sort((a, b) => a - b);
                return {
                    array: sorted,
                    steps: generateBinarySearchSteps(sorted, target)
                };
            }
        },
        bs_rec: {
            title: "Binary Search Visualizer (Recursive)",
            subtitle: "Binary Search implemented using recursion.",
            code: recursiveCode,
            generator: function (arr, target) {
                const sorted = arr.slice().sort((a, b) => a - b);
                return {
                    array: sorted,
                    steps: generateRecursiveBinarySteps(sorted, target)
                };
            }
        }
    };

    function parseArrayInput() {
        const raw = (arrayInput.value || "").trim();
        if (!raw) return [];
        return raw
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((v) => !Number.isNaN(v));
    }

    function parseTargetInput() {
        const raw = (targetInput.value || "").trim();
        const n = Number(raw);
        // If NaN, just keep raw (in case you want string matching later)
        return Number.isNaN(n) ? raw : n;
    }

    function buildConfigFromInputs() {
        const baseArray = parseArrayInput();
        const target = parseTargetInput();

        const vis = VISUALIZERS[currentMode];

        if (!baseArray.length) {
            return {
                title: "No Data",
                subtitle: "Please enter some numbers in the array field.",
                array: [],
                target,
                code: vis.code,
                steps: []
            };
        }

        if (currentMode === "linear") {
            return {
                title: vis.title,
                subtitle: vis.subtitle,
                array: baseArray,
                target,
                code: vis.code,
                steps: vis.generator(baseArray, target)
            };
        }

        // Binary modes use sorted copy
        const result = vis.generator(baseArray, target);
        return {
            title: vis.title,
            subtitle: vis.subtitle,
            array: result.array,
            target,
            code: vis.code,
            steps: result.steps
        };
    }

    function loadVisualizer() {
        const config = buildConfigFromInputs();
        initPPVisualizer(config);
    }

    // Mode buttons
    modeButtons.forEach((btn) => {
        btn.addEventListener("click", function () {
            const mode = btn.getAttribute("data-mode");
            if (!mode || !VISUALIZERS[mode]) return;
            currentMode = mode;
            loadVisualizer();
        });
    });

    // Apply button (rerun with new inputs)
    if (applyBtn) {
        applyBtn.addEventListener("click", function () {
            loadVisualizer();
        });
    }

    // Initial load
    loadVisualizer();
});
