const manifestUrl = "./topics-manifest.json";
const MODE = "DAILY"; // "DAILY" | "RANDOM"

/* ---------------- Utilities ---------------- */

async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    return res.json();
}

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function pickDailyIndex(length) {
    const key = todayKey();
    let sum = 0;
    for (let c of key) sum += c.charCodeAt(0);
    return sum % length;
}

function showError(err) {
    const box = document.getElementById("errorBox");
    box.style.display = "block";
    box.textContent = "Renderer Error:\n" + (err?.message || err);
}

/* ---------------- Render Core ---------------- */

function renderTip(tip, topicName) {
    document.getElementById("appTitle").textContent =
        `Programmer’s Picnic — ${topicName.toUpperCase()} Tip`;

    document.getElementById("conceptText").textContent = tip.concept || "";
    document.getElementById("whyText").textContent = tip.why || "";
    document.getElementById("challengeText").textContent = tip.challenge || "";

    renderChips(topicName, tip);
    renderSVG(tip.svgs || []);
    renderCodeTabs(tip.code || {});
    renderMCQs(tip.mcqs || []);
}

/* ---------------- Chips ---------------- */

function renderChips(topicName, tip) {
    const chips = document.getElementById("chips");
    chips.innerHTML = "";

    const make = t => {
        const s = document.createElement("span");
        s.className = "chip";
        s.textContent = t;
        return s;
    };

    chips.appendChild(make("#" + topicName));
    if (tip.estimatedSeconds) chips.appendChild(make("⏱ " + tip.estimatedSeconds + "s"));
    if (tip.difficulty) chips.appendChild(make("⭐ " + tip.difficulty));
}

/* ---------------- SVG ---------------- */

function renderSVG(svgs) {
    const box = document.getElementById("svgBox");
    box.innerHTML = svgs.length ? svgs[0] : "No visual available";
}

/* ---------------- Code Tabs ---------------- */

function renderCodeTabs(code) {
    const tabs = document.getElementById("codeTabs");
    const pre = document.getElementById("codeBlock");
    tabs.innerHTML = "";
    pre.textContent = "";

    const langs = Object.keys(code || {});
    if (!langs.length) {
        pre.textContent = "No code available.";
        return;
    }

    langs.forEach((lang, i) => {
        const btn = document.createElement("div");
        btn.className = "tab" + (i === 0 ? " active" : "");
        btn.textContent = lang.toUpperCase();

        btn.onclick = () => {
            tabs.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            btn.classList.add("active");
            pre.textContent = code[lang];
        };

        tabs.appendChild(btn);
    });

    pre.textContent = code[langs[0]];
}

/* ---------------- MCQ ENGINE (STEP 3) ---------------- */

function renderMCQs(mcqs) {
    const box = document.getElementById("mcqBox");
    box.innerHTML = "";

    if (!mcqs.length) {
        box.innerHTML = "<div class='small'>No MCQs for this tip.</div>";
        return;
    }

    mcqs.forEach((mcq, qIndex) => {
        const qDiv = document.createElement("div");
        qDiv.className = "q";
        qDiv.innerHTML = `<b>Q${qIndex + 1}. ${mcq.q}</b>`;

        mcq.options.forEach((opt, optIndex) => {
            const btn = document.createElement("button");
            btn.className = "btn secondary";
            btn.style.display = "block";
            btn.style.margin = "6px 0";
            btn.textContent = opt;

            btn.onclick = () => {
                // lock question after answer
                qDiv.querySelectorAll("button").forEach(b => b.disabled = true);

                if (optIndex === mcq.correctIndex) {
                    qDiv.classList.add("good");
                    btn.style.borderColor = "var(--good)";
                } else {
                    qDiv.classList.add("bad");
                    btn.style.borderColor = "var(--bad)";
                }

                if (mcq.explanation) {
                    const exp = document.createElement("div");
                    exp.className = "small";
                    exp.style.marginTop = "6px";
                    exp.innerHTML = `<b>Explanation:</b> ${mcq.explanation}`;
                    qDiv.appendChild(exp);
                }
            };

            qDiv.appendChild(btn);
        });

        box.appendChild(qDiv);
    });
}

/* ---------------- Data Collection ---------------- */

async function collectAllTips(manifest) {
    const all = [];

    for (const topic of manifest.topics) {
        const data = await loadJSON("./" + topic.url);
        data.tips.forEach((tip, index) => {
            all.push({
                topic: data.topic || topic.name,
                tipIndex: index,
                tip
            });
        });
    }

    return all;
}

/* ---------------- App Init ---------------- */

async function initApp() {
    try {
        const manifest = await loadJSON(manifestUrl);
        const allTips = await collectAllTips(manifest);

        let selected;

        if (MODE === "RANDOM") {
            selected = allTips[Math.floor(Math.random() * allTips.length)];
        } else {
            const today = todayKey();
            const saved = JSON.parse(localStorage.getItem("pp_daily_tip") || "null");

            if (saved && saved.date === today) {
                selected = saved.tip;
            } else {
                const idx = pickDailyIndex(allTips.length);
                selected = allTips[idx];
                localStorage.setItem(
                    "pp_daily_tip",
                    JSON.stringify({ date: today, tip: selected })
                );
            }
        }

        renderTip(selected.tip, selected.topic);
    } catch (err) {
        showError(err);
        console.error(err);
    }
}

initApp();
