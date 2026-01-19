/* NLP Lab (Web) — Beginner friendly, offline-first logic
   - Tokenization, stopwords, synonyms/antonyms demo
   - Cosine similarity (bag-of-words)
   - Translation demo (tiny dictionary)
   - Charts (Chart.js via CDN if available)
*/

const $ = (id) => document.getElementById(id);

const STOP_EN = new Set([
  "a","an","the","and","or","but","if","then","else","when","while","for","to","of","in","on","at","by","from",
  "with","without","as","is","are","was","were","be","been","being","it","this","that","these","those","i","you",
  "he","she","we","they","me","my","your","his","her","our","their","them","us","do","does","did","doing",
  "can","could","may","might","will","would","shall","should","must","not","no","yes","so","very","just",
  "into","about","over","under","up","down","out","off","than","too","also"
]);

const THESAURUS = {
  "understand": {syn:["comprehend","grasp","recognize"], ant:["misunderstand","ignore"]},
  "help": {syn:["assist","support","aid"], ant:["harm","hinder"]},
  "important": {syn:["significant","crucial","vital"], ant:["unimportant","minor"]},
  "happy": {syn:["joyful","glad","cheerful"], ant:["sad","unhappy"]},
  "difficult": {syn:["hard","challenging","tough"], ant:["easy","simple"]},
  "fast": {syn:["quick","rapid","speedy"], ant:["slow","sluggish"]}
};

// Tiny offline translation demo (word-by-word)
const EN_HI = {
  "nlp":"एनएलपी",
  "helps":"मदद",
  "help":"मदद",
  "students":"छात्रों",
  "student":"छात्र",
  "learn":"सीखना",
  "language":"भाषा",
  "faster":"तेजी",
  "today":"आज",
  "important":"महत्वपूर्ण",
  "computer":"कंप्यूटर",
  "computers":"कंप्यूटर",
  "understand":"समझना",
  "human":"मानव",
  "people":"लोग",
  "natural":"प्राकृतिक",
  "processing":"प्रोसेसिंग",
  "machines":"मशीनें",
  "machine":"मशीन"
};
const HI_EN = Object.fromEntries(Object.entries(EN_HI).map(([k,v])=>[v,k]));
HI_EN["मदद"] = "help";

function normalizeEnglish(s){
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenizeEnglish(s){
  const n = normalizeEnglish(s);
  return n ? n.split(" ").filter(Boolean) : [];
}
function tokenizeHindiBasic(s){
  return (s || "")
    .replace(/[^\u0900-\u097F0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}
function removeStopwords(tokens){
  return tokens.filter(w => !STOP_EN.has(w));
}
function freq(tokens){
  const m = new Map();
  for(const t of tokens) m.set(t, (m.get(t)||0)+1);
  return m;
}
function topK(map, k=12){
  return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,k);
}

function cosineFromTokens(t1, t2){
  const f1 = freq(t1);
  const f2 = freq(t2);
  const vocab = Array.from(new Set([...f1.keys(), ...f2.keys()])).sort();
  const A = vocab.map(w => f1.get(w) || 0);
  const B = vocab.map(w => f2.get(w) || 0);

  let dot=0, na=0, nb=0;
  for(let i=0;i<vocab.length;i++){
    dot += A[i]*B[i];
    na += A[i]*A[i];
    nb += B[i]*B[i];
  }
  na = Math.sqrt(na); nb = Math.sqrt(nb);
  const cos = (na===0 || nb===0) ? 0 : dot/(na*nb);
  return {cos, vocab, A, B};
}

function enToHiDemo(s){
  const t = tokenizeEnglish(s);
  return t.map(w => EN_HI[w] || w).join(" ").trim();
}
function hiToEnDemo(s){
  const t = tokenizeHindiBasic(s);
  return t.map(w => HI_EN[w] || w).join(" ").trim();
}

function copyToClipboard(text){
  if(!navigator.clipboard){ alert("Clipboard not available here."); return; }
  navigator.clipboard.writeText(text).catch(()=>alert("Copy failed."));
}

// Charts
let chartCounts = null;
let chartSim = null;

function ensureCharts(){
  if(typeof Chart === "undefined") return; // offline
  if(!chartCounts){
    const ctx = $("chartCounts").getContext("2d");
    chartCounts = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Sentence A","Sentence B"],
        datasets: [
          { label:"Tokens (raw)", data:[0,0] },
          { label:"Tokens (after stopwords)", data:[0,0] }
        ]
      },
      options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
    });
  }
  if(!chartSim){
    const ctx = $("chartSim").getContext("2d");
    chartSim = new Chart(ctx, {
      type: "bar",
      data: { labels:["Cosine Similarity"], datasets:[{ label:"Score (0→1)", data:[0] }] },
      options: { responsive:true, scales:{ y:{ beginAtZero:true, max:1 } } }
    });
  }
}

function updateCharts(aRaw,bRaw,aClean,bClean,cos){
  ensureCharts();
  if(chartCounts){
    chartCounts.data.datasets[0].data = [aRaw,bRaw];
    chartCounts.data.datasets[1].data = [aClean,bClean];
    chartCounts.update();
  }
  if(chartSim){
    chartSim.data.datasets[0].data = [Number(cos.toFixed(4))];
    chartSim.update();
  }
}

let currentCosineScore = 0;

function analyze(){
  const mode = $("mode").value;
  const removeStops = $("stopMode").value === "yes";
  const A = $("textA").value;
  const B = $("textB").value;

  let ta = [], tb = [];
  if(mode === "en"){
    ta = tokenizeEnglish(A);
    tb = tokenizeEnglish(B);
  } else {
    ta = tokenizeHindiBasic(A);
    tb = tokenizeHindiBasic(B);
  }

  const ta2 = (mode === "en" && removeStops) ? removeStopwords(ta) : ta.slice();
  const tb2 = (mode === "en" && removeStops) ? removeStopwords(tb) : tb.slice();

  const fa = freq(ta2), fb = freq(tb2);

  const lines = [];
  lines.push("=== NLP ANALYZE ===");
  lines.push("Mode: " + (mode === "en" ? "English" : "Hindi demo"));
  lines.push("Stopwords removed: " + ((mode==="en" && removeStops) ? "YES" : "NO / N.A."));
  lines.push("");
  lines.push("Sentence A raw tokens: " + ta.length);
  lines.push("Sentence A final tokens: " + ta2.length);
  lines.push("Tokens A: " + JSON.stringify(ta2));
  lines.push("");
  lines.push("Sentence B raw tokens: " + tb.length);
  lines.push("Sentence B final tokens: " + tb2.length);
  lines.push("Tokens B: " + JSON.stringify(tb2));
  lines.push("");
  lines.push("Top words A: " + JSON.stringify(topK(fa,10)));
  lines.push("Top words B: " + JSON.stringify(topK(fb,10)));
  lines.push("");
  lines.push("Next: Try TF-IDF + embeddings in Python scripts.");

  $("outAnalyze").textContent = lines.join("\n");

  updateCharts(ta.length, tb.length, ta2.length, tb2.length, currentCosineScore);
}

function computeCosine(){
  const mode = $("mode").value;
  if(mode !== "en"){
    $("outCosine").textContent = "Cosine demo is enabled for English mode. Switch Mode to English.";
    return;
  }
  const removeStops = $("stopMode").value === "yes";
  let ta = tokenizeEnglish($("textA").value);
  let tb = tokenizeEnglish($("textB").value);
  if(removeStops){
    ta = removeStopwords(ta);
    tb = removeStopwords(tb);
  }

  const r = cosineFromTokens(ta, tb);
  currentCosineScore = r.cos;

  const pct = (r.cos*100).toFixed(1);
  let level = "Mostly different";
  if(r.cos >= 0.80) level = "Very similar";
  else if(r.cos >= 0.55) level = "Moderately similar";
  else if(r.cos >= 0.30) level = "Some overlap";

  $("outCosine").textContent =
    "=== COSINE ===\n" +
    "Score: " + r.cos.toFixed(4) + " (" + pct + "%)\n" +
    "Interpretation: " + level + "\n\n" +
    "Note: Bag-of-words ignores deep meaning.\nTry embeddings later.";

  analyze();
}

function showVectors(){
  const mode = $("mode").value;
  if(mode !== "en"){
    $("outVectors").textContent = "Vectors demo is enabled for English mode. Switch Mode to English.";
    return;
  }
  const removeStops = $("stopMode").value === "yes";
  let ta = tokenizeEnglish($("textA").value);
  let tb = tokenizeEnglish($("textB").value);
  if(removeStops){
    ta = removeStopwords(ta);
    tb = removeStopwords(tb);
  }
  const r = cosineFromTokens(ta, tb);

  $("outVectors").textContent =
    "Vocabulary (" + r.vocab.length + "):\n" + r.vocab.join(", ") +
    "\n\nVector A:\n" + JSON.stringify(r.A) +
    "\n\nVector B:\n" + JSON.stringify(r.B);
}

function lookupWord(){
  const w = ($("word").value || "").toLowerCase().trim();
  if(!w){ $("outLookup").textContent = "Type a word first."; return; }
  const entry = THESAURUS[w];
  if(!entry){
    $("outLookup").textContent =
      "No demo entry for: " + w +
      "\nAdd it in THESAURUS in app.js.\nTry: understand, help, important, happy, difficult, fast";
    return;
  }
  $("outLookup").textContent =
    "Word: " + w +
    "\nSynonyms: " + entry.syn.join(", ") +
    "\nAntonyms: " + entry.ant.join(", ");
}

function translateEnHi(){
  $("outEnHi").textContent = enToHiDemo($("enIn").value) || "(empty)";
}
function translateHiEn(){
  $("outHiEn").textContent = hiToEnDemo($("hiIn").value) || "(empty)";
}

function resetAll(){
  $("textA").value = "NLP helps computers understand human language.";
  $("textB").value = "Natural language processing allows machines to understand people.";
  $("mode").value = "en";
  $("stopMode").value = "yes";
  $("word").value = "";
  $("enIn").value = "NLP helps students learn language faster.";
  $("hiIn").value = "एनएलपी छात्रों को भाषा तेजी से सीखने में मदद करता है";
  currentCosineScore = 0;
  $("outAnalyze").textContent = "Click “Analyze”.";
  $("outCosine").textContent = "Click “Compute Cosine”.";
  $("outVectors").textContent = "Click “Show Vectors”.";
  $("outLookup").textContent = "Ready.";
  $("outEnHi").textContent = "Output…";
  $("outHiEn").textContent = "Output…";
  analyze();
}

function init(){
  $("stopList").textContent = Array.from(STOP_EN).sort().join(", ");

  $("btnAnalyze").addEventListener("click", analyze);
  $("btnSwap").addEventListener("click", ()=>{
    const a = $("textA").value;
    $("textA").value = $("textB").value;
    $("textB").value = a;
  });
  $("btnReset").addEventListener("click", resetAll);

  $("btnCosine").addEventListener("click", computeCosine);
  $("btnVectors").addEventListener("click", showVectors);

  $("btnLookup").addEventListener("click", lookupWord);

  $("btnEnHi").addEventListener("click", translateEnHi);
  $("btnHiEn").addEventListener("click", translateHiEn);

  $("btnCopyEnHi").addEventListener("click", ()=>copyToClipboard($("outEnHi").textContent));
  $("btnCopyHiEn").addEventListener("click", ()=>copyToClipboard($("outHiEn").textContent));

  $("mode").addEventListener("change", analyze);
  $("stopMode").addEventListener("change", analyze);

  resetAll();
  translateEnHi();
  translateHiEn();
}
init();
