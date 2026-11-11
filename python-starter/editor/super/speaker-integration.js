/* Cartoon Teacher companion for the existing Python editor.
   This file is isolated from app.js and never runs or alters Python code. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const panel = $("ppSpeakerPanel");
  const frame = $("ppSpeakerFrame");
  const toggle = $("ppSpeakerToggle");
  const close = $("ppSpeakerClose");
  const hint = $("ppSpeakerHint");
  const language = $("ppSpeakerLanguage");
  const actions = document.querySelectorAll("[data-speaker-action]");
  if (!panel || !frame || !toggle || !hint || !language) return;

  const SPEAKER_ORIGIN = "https://dsa.learnwithchampak.live";
  const SPEAKER_URL = SPEAKER_ORIGIN + "/tools/cartoon-speaker/?embed=1&roaming=1";
  let frameReady = false;
  let pending = null;
  function syncDisplay(){
    if(!frameReady || !frame.contentWindow)return;
    frame.contentWindow.postMessage({type:"lwc-speaker:display",version:2,roaming:$("ppWalkOnPage")?.checked===true},SPEAKER_ORIGIN);
  }
  const walkOnPage = $("ppWalkOnPage");
  const walker = window.LWCWalkingTeacher;
  let lastTargetedPanel = null;
  function markTeachingPanel(mode) {
    if(lastTargetedPanel)lastTargetedPanel.classList.remove("lwc-teacher-targeted");
    lastTargetedPanel=mode==="error" ? $("ppErr")?.closest(".card") :
      mode==="output" ? $("ppOut")?.closest(".card") : document.querySelector(".codeCard");
    lastTargetedPanel?.classList.add("lwc-teacher-targeted");
  }
  window.addEventListener("message",event=>{
    if(event.origin!==SPEAKER_ORIGIN||event.source!==frame.contentWindow)return;
    const data=event.data;
    if(!data||data.type!=="lwc-speaker:scene"||data.version!==2)return;
    if(data.kind==="line")markTeachingPanel(data.mode||"code");
    if(["finish","error"].includes(data.kind)||data.kind==="state"&&["stopped","error"].includes(data.state)){
      lastTargetedPanel?.classList.remove("lwc-teacher-targeted");
    }
    if(walkOnPage?.checked)walker?.scene(data);
  });
  if(walkOnPage)walkOnPage.addEventListener("change",()=>{
    walker?.enable(walkOnPage.checked);
    syncDisplay();
    try{localStorage.setItem("lwc_editor_roaming_v1",walkOnPage.checked?"1":"0")}catch(_){}
  });
  if(walkOnPage){try{
    walkOnPage.checked=localStorage.getItem("lwc_editor_roaming_v1")!=="0";
  }catch(_){}walker?.enable(walkOnPage.checked);}

  const safeLine = value => String(value || "").replace(/\s+/g, " ").trim().slice(0, 130);
  const cue = (emotion, gesture, lang, text) => `[${emotion}|${gesture}|${lang}] ${text}`;
  const inHindi = () => language.value === "hi-IN";
  function showPanel() {
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    if (!frame.getAttribute("src")) frame.setAttribute("src", SPEAKER_URL);
  }
  function hidePanel() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    // Keep the iframe alive, preserving its voice settings and script.
  }
  function queueNarration(lines, description, mode="code", scenes=[]) {
    const script = lines.join("\n").slice(0, 15990);
    if (!script.trim()) { hint.textContent = "Nothing is available to narrate."; return; }
    pending = {type: "lwc-speaker:load", version: 1, script, autoplay: true, mode, scenes:scenes.slice(0,100)};
    showPanel();
    hint.textContent = `${description} — the cartoon should begin speaking automatically. If your browser blocks audio, press “Speak script” in the panel.`;
    if (frameReady && frame.contentWindow) {
      frame.contentWindow.postMessage(pending, SPEAKER_ORIGIN);
      pending = null;
    }
  }
  frame.addEventListener("load", () => {
    frameReady = true;
    syncDisplay();
    if (pending && frame.contentWindow) {
      frame.contentWindow.postMessage(pending, SPEAKER_ORIGIN);
      pending = null;
    }
  });

  function describeLine(raw, hindi) {
    const line = safeLine(raw);
    const say = (en, hi) => hindi ? hi : en;
    let match;
    if ((match = line.match(/^#\s*(.*)$/)))
      return say("This is a comment: " + match[1], "यह एक टिप्पणी है: " + match[1]);
    if ((match = line.match(/^from\s+([\w.]+)\s+import\s+(.+)/)))
      return say(`It imports ${match[2]} from the ${match[1]} module.`, `यह ${match[1]} मॉड्यूल से ${match[2]} इम्पोर्ट करता है।`);
    if ((match = line.match(/^import\s+(.+)/)))
      return say(`It imports the module ${match[1]}.`, `यह ${match[1]} मॉड्यूल इम्पोर्ट करता है।`);
    if ((match = line.match(/^def\s+(\w+)\s*\(/)))
      return say(`It defines a function named ${match[1]}.`, `यह ${match[1]} नाम का फ़ंक्शन बनाता है।`);
    if ((match = line.match(/^class\s+(\w+)/)))
      return say(`It defines a class named ${match[1]}.`, `यह ${match[1]} नाम की क्लास बनाता है।`);
    if (/^for\b/.test(line))
      return say("This for loop repeats its indented block for each item in an iterable.", "यह फॉर लूप हर आइटम के लिए अपना इंडेंट किया हुआ ब्लॉक दोहराता है।");
    if (/^while\b/.test(line))
      return say("This while loop repeats as long as its condition remains true.", "यह व्हाइल लूप तब तक दोहराता है जब तक इसकी शर्त सही है।");
    if (/^(if|elif)\b/.test(line))
      return say("This condition decides whether the indented block will run.", "यह शर्त तय करती है कि इंडेंट किया हुआ ब्लॉक चलेगा या नहीं।");
    if (/^else\s*:/.test(line))
      return say("This else block runs when the preceding conditions do not match.", "पिछली शर्तें गलत होने पर यह एल्स ब्लॉक चलता है।");
    if (/^print\s*\(/.test(line))
      return say("The print function displays a value in the output.", "प्रिंट फ़ंक्शन आउटपुट में वैल्यू दिखाता है।");
    if ((match = line.match(/^(\w+)\s*=\s*input\s*\(/)))
      return say(`The program asks for input and stores the response in ${match[1]}.`, `प्रोग्राम इनपुट लेकर उसे ${match[1]} में रखता है।`);
    if (/^return\b/.test(line))
      return say("This returns a value from the current function.", "यह फ़ंक्शन से एक वैल्यू वापस करता है।");
    if ((match = line.match(/^([A-Za-z_]\w*)\s*=(?!=)/)))
      return say(`This assigns a value to the variable ${match[1]}.`, `यह ${match[1]} वेरिएबल में एक वैल्यू रखता है।`);
    if (/^(try|except|finally)\b/.test(line))
      return say("This statement is part of Python exception handling.", "यह Python में एरर को संभालने का हिस्सा है।");
    return say("Here the program has the Python statement: " + line,
               "इस लाइन में Python का यह स्टेटमेंट है: " + line);
  }

  function demoWalkAndTalk(){
    const lang=language.value,hindi=inHindi();
    const lines=[
      cue("happy","welcome",lang,hindi?"नमस्ते! मैं आपके Python editor पर आ गया हूँ।":"Hello! I am walking right on your Python editor."),
      cue("explaining","point-left",lang,hindi?"यहाँ आप Python कोड लिखते हैं।":"Here is where you write your Python code."),
      cue("explaining","point-right",lang,hindi?"अब मैं output panel की ओर जा रहा हूँ।":"Now I am walking across to the output panel."),
      cue("concerned","think",lang,hindi?"इस जगह पर error messages दिखाई देते हैं।":"Any Python errors appear in this panel."),
      cue("encouraging","celebrate",lang,hindi?"बहुत बढ़िया! अब मैं फिर से कोड समझाने के लिए तैयार हूँ।":"Excellent! Now I am ready to teach you more Python.")
    ];
    queueNarration(lines,"Walking teacher demo prepared","code",[
      {mode:"code",zone:"center",lookAt:"audience"},
      {mode:"code",zone:"left",lookAt:"code",sourceLine:1},
      {mode:"output",zone:"right",lookAt:"output"},
      {mode:"error",zone:"right",lookAt:"error"},
      {mode:"code",zone:"center",lookAt:"audience"}
    ]);
  }
  function speakProgramComments(reportIfEmpty=true) {
    const code=$("ppCode"), parser=window.LWCPythonCommentDialogues;
    if(!code||!parser){hint.textContent="The comment narration module did not load. Refresh the editor.";return false;}
    const selected=code.value.slice(code.selectionStart,code.selectionEnd);
    const source=selected.trim()?selected:code.value;
    const firstLine=selected.trim()?code.value.slice(0,code.selectionStart).split(/\r?\n/).length:1;
    const dialogues=parser.extract(source,firstLine,language.value);
    if(!dialogues.length){
      if(reportIfEmpty)hint.textContent="No spoken Python comments were found. Add # Your dialogue to the code, or use Explain Code for a generated walkthrough.";
      return false;
    }
    const lines=[],scenes=[];
    let chars=0;
    for(const item of dialogues.slice(0,75)){
      if(chars+item.script.length+1>14500)break;
      lines.push(item.script);
      scenes.push(item.scene);
      chars+=item.script.length+1;
    }
    if(!lines.length){hint.textContent="The comments are too long to narrate in one session.";return false;}
    queueNarration(lines,"Speaking "+lines.length+" Python comment"+(lines.length===1?"":"s")+" in source order","code",scenes);
    return true;
  }

  function explainCode() {
    // Program comments are the author-written dialogue; use them before generated descriptions.
    if(speakProgramComments(false))return;
    const code = $("ppCode");
    if (!code) return;
    const selected = code.value.slice(code.selectionStart, code.selectionEnd).trim();
    const source = selected || code.value;
    const firstLine = selected ? code.value.slice(0, code.selectionStart).split(/\r?\n/).length : 1;
    const rows = source.split(/\r?\n/).map((line, index) => ({line: line.trim(), number: firstLine + index}))
      .filter(item => item.line.length);
    if (!rows.length) { hint.textContent = "Write some Python code first."; return; }
    const hindi = inHindi(), lang = language.value;
    const lines = [
      cue("happy", "welcome", lang, hindi ? "आइए इस Python प्रोग्राम को समझते हैं।" : "Let us walk through this Python program.")
    ];
    const scenes=[{mode:"code",zone:"center",lookAt:"audience"}];
    rows.slice(0, 35).forEach((item, idx) => {
      const prefix = hindi ? `लाइन ${item.number}। ` : `Line ${item.number}. `;
      const body = describeLine(item.line, hindi);
      lines.push(cue("explaining", idx % 3 === 0 ? "count" : "explain", lang, prefix + body));
      scenes.push({mode:"code",zone:"left",lookAt:"code",sourceLine:item.number});
    });
    if(rows.length>35){
      lines.push(cue("thinking","think",lang,hindi?"अभी पहली पैंतीस सक्रिय लाइनों को समझाया गया है।":"This walkthrough covers the first thirty five nonempty lines."));
      scenes.push({mode:"code",zone:"center",lookAt:"audience"});
    }
    // A full walkthrough visits the visible output and error panels too.
    const shownOut=$("ppOut")?.textContent?.trim()||"";
    if(shownOut && !["Output will appear here.","(no stdout)","Running…"].includes(shownOut)){
      lines.push(cue("explaining","point-right",lang,hindi?"अब हम output panel में दिख रहे परिणाम देखेंगे।":"Let us visit the output panel and examine its currently displayed results."));
      scenes.push({mode:"output",zone:"right",lookAt:"output"});
      shownOut.split(/\r?\n/).filter(Boolean).slice(0,3).forEach((value,i)=>{
        lines.push(cue("explaining","point-right",lang,(hindi?`आउटपुट लाइन ${i+1}: `:`Output line ${i+1}: `)+safeLine(value)));
        scenes.push({mode:"output",zone:"right",lookAt:"output"});
      });
    }
    const shownError=$("ppErr")?.textContent?.trim()||"";
    if(shownError && shownError!=="Errors will appear here."){
      lines.push(cue("concerned","think",lang,hindi?"अब error panel की जाँच करते हैं।":"Now let us inspect the error panel."));
      scenes.push({mode:"error",zone:"right",lookAt:"error"});
    }
    lines.push(cue("encouraging","welcome",lang,hindi?"अब आप अपना Python प्रोग्राम आगे बढ़ा सकते हैं।":"You can now continue developing your Python program."));
    scenes.push({mode:"code",zone:"center",lookAt:"audience"});
    queueNarration(lines,selected?"Selected code explained":"Code walkthrough prepared","code",scenes);
  }

  function readOutput() {
    const output = $("ppOut")?.textContent?.trim() || "";
    if (!output || ["Output will appear here.", "(no stdout)", "Running…"].includes(output)) {
      hint.textContent = "Run the program first to produce output.";
      return;
    }
    const hindi = inHindi(), lang = language.value;
    const parts = output.split(/\r?\n/).filter(line => line.trim()).slice(0, 25);
    const lines=[cue("happy","welcome",lang,hindi?"अब प्रोग्राम का आउटपुट सुनिए।":"Here is the program output.")];
    const scenes=[{mode:"output",zone:"center",lookAt:"audience"}];
    parts.forEach((line,idx)=>{
      lines.push(cue("explaining","point-right",lang,(hindi?`आउटपुट लाइन ${idx+1}: `:`Output line ${idx+1}: `)+safeLine(line)));
      scenes.push({mode:"output",zone:"right",lookAt:"output"});
    });
    if(output.split(/\r?\n/).length>25){
      lines.push(cue("thinking","think",lang,hindi?"बाकी आउटपुट स्क्रीन पर देखिए।":"The remaining output is visible on screen."));
      scenes.push({mode:"output",zone:"right",lookAt:"output"});
    }
    queueNarration(lines,"Output narration prepared","output",scenes);
  }

  function explainError() {
    const error = $("ppErr")?.textContent?.trim() || "";
    if (!error || error === "Errors will appear here.") {
      hint.textContent = "No error is displayed. Run your program to check for errors.";
      return;
    }
    const hindi = inHindi(), lang = language.value;
    const match = [...error.matchAll(/\b([A-Za-z]+(?:Error|Exception)):\s*([^\n]+)/g)].pop();
    const name = match ? match[1] : "Python error";
    const detail = match ? safeLine(match[2]) : safeLine(error.split(/\r?\n/).filter(Boolean).pop());
    const fixes = {
      SyntaxError: ["Check punctuation, quotes, brackets and Python syntax.", "कोलन, कोटेशन, ब्रैकेट और सिंटैक्स जाँचिए।"],
      IndentationError: ["Check that blocks are indented consistently.", "इंडेंटेशन और स्पेस की एकरूपता जाँचिए।"],
      NameError: ["Check that the variable is defined and correctly spelled.", "देखिए वेरिएबल पहले बनाया गया है और नाम सही लिखा है।"],
      TypeError: ["Check whether the operation is compatible with the value types.", "वैल्यू के टाइप और ऑपरेशन का मिलान जाँचिए।"],
      ValueError: ["Check whether the supplied value has the expected format.", "दी गई वैल्यू का फ़ॉर्मैट जाँचिए।"],
      IndexError: ["Check that the sequence index is within bounds.", "इंडेक्स लिस्ट की सीमा में है या नहीं, जाँचिए।"],
      KeyError: ["Check that the requested dictionary key exists.", "डिक्शनरी में वह की मौजूद है या नहीं, जाँचिए।"],
      ModuleNotFoundError: ["Check the module name and whether it is installed.", "मॉड्यूल का नाम और इंस्टॉल होना जाँचिए।"],
      ZeroDivisionError: ["Avoid dividing by zero.", "शून्य से भाग देने से बचिए।"]
    };
    const fix = fixes[name] || ["Inspect the traceback for the failing line and statement.",
      "ट्रेसबैक में दिखाई गई लाइन और स्टेटमेंट की जाँच कीजिए।"];
    const tracebackLine=Number((error.match(/File .*?, line (\d+)/)||[])[1])||null;
    queueNarration([
      cue("concerned","think",lang,hindi?`प्रोग्राम में ${name} आया है।`:`The program reports ${name}.`),
      cue("explaining","point-right",lang,(hindi?"एरर संदेश: ":"Error message: ")+detail),
      cue("encouraging","explain",lang,hindi?fix[1]:fix[0])
    ],"Error explanation prepared","error",[
      {mode:"error",zone:"center",lookAt:"audience",sourceLine:tracebackLine},
      {mode:"error",zone:"right",lookAt:"error",sourceLine:tracebackLine},
      {mode:"error",zone:"right",lookAt:"error",sourceLine:tracebackLine}
    ]);
  }

  toggle.addEventListener("click", () => panel.hidden ? showPanel() : hidePanel());
  if (close) close.addEventListener("click", hidePanel);
  actions.forEach(button => button.addEventListener("click", () => {
    if (button.dataset.speakerAction === "comments") speakProgramComments(true);
    else if (button.dataset.speakerAction === "walk-demo") demoWalkAndTalk();
    else if (button.dataset.speakerAction === "code") explainCode();
    else if (button.dataset.speakerAction === "output") readOutput();
    else if (button.dataset.speakerAction === "error") explainError();
  }));
})();
