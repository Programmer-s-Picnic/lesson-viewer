/* Cartoon Teacher companion for the existing Python editor.
   This file is isolated from app.js and never runs or alters Python code. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const panel = $("ppSpeakerPanel");
  const frame = $("ppSpeakerFrame");
  const handle = $("ppSpeakerDragHandle");
  const settings = $("ppSpeakerSettings");
  const stateLabel = $("ppSpeakerState");
  const runButton = document.querySelector('[data-speaker-action="run"]');
  const hint = $("ppSpeakerHint");
  const language = $("ppSpeakerLanguage");
  const actions = document.querySelectorAll("[data-speaker-action]");
  if (!panel || !frame || !hint || !language || !stateLabel) return;

  const SPEAKER_ORIGIN = "https://dsa.learnwithchampak.live";
  const SPEAKER_URL = SPEAKER_ORIGIN + "/tools/cartoon-speaker/?embed=1&roaming=1&studioVersion=guided-run-1";
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
    if(data.kind==="line"){
      markTeachingPanel(data.mode||"code");
      stateLabel.textContent="Speaking";
      stateLabel.dataset.status="speaking";
      hint.textContent=String(data.caption||"Speaking").slice(0,130);
    }
    if(["finish","error"].includes(data.kind)||data.kind==="state"&&["stopped","error"].includes(data.state)){
      lastTargetedPanel?.classList.remove("lwc-teacher-targeted");
    }
    if(data.kind==="finish"){
      stateLabel.textContent="Finished";stateLabel.dataset.status="finished";
      hint.textContent="Narration complete. Choose another action.";
    }else if(data.kind==="error"||data.kind==="state"&&data.state==="error"){
      stateLabel.textContent="Speech error";stateLabel.dataset.status="error";
      hint.textContent="Voice could not start. Open speech controls below and press Speak script.";
      if(settings)settings.open=true;
    }else if(data.kind==="state"&&data.state==="paused"){
      stateLabel.textContent="Paused";stateLabel.dataset.status="paused";
    }else if(data.kind==="state"&&data.state==="stopped"){
      stateLabel.textContent="Ready";stateLabel.dataset.status="ready";
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
    // Menu remains present in every editor view, and speech engine stays loaded.
    panel.hidden=false;
    if(!frame.getAttribute("src"))frame.setAttribute("src",SPEAKER_URL);
  }
  function queueNarration(lines, description, mode="code", scenes=[]) {
    const script = lines.join("\n").slice(0, 15990);
    if (!script.trim()) { hint.textContent = "Nothing is available to narrate."; return; }
    pending = {type: "lwc-speaker:load", version: 1, script, autoplay: true, mode, scenes:scenes.slice(0,100)};
    showPanel();
    stateLabel.textContent=frameReady?"Starting…":"Loading voice…";
    stateLabel.dataset.status="loading";
    hint.textContent=description+". If audio is blocked, open voice controls below.";
    if (frameReady && frame.contentWindow) {
      frame.contentWindow.postMessage(pending, SPEAKER_ORIGIN);
      pending = null;
    }
  }
  frame.addEventListener("load", () => {
    frameReady = true;
    if(stateLabel.dataset.status==="loading"&&!pending){
      stateLabel.textContent="Ready";stateLabel.dataset.status="ready";
    }
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
      return match[1].trim();
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
    if(walkOnPage?.checked&&dialogues[0]?.scene?.mode==="code")
      walker?.revealLine?.(dialogues[0].sourceLine);
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
    if(walkOnPage?.checked)walker?.revealLine?.(rows[0].number);
    const hindi = inHindi(), lang = language.value;
    const lines = [
      cue("happy", "welcome", lang, hindi ? "आइए इस Python प्रोग्राम को समझते हैं।" : "Let us walk through this Python program.")
    ];
    const scenes=[{mode:"code",zone:"center",lookAt:"audience"}];
    rows.slice(0, 35).forEach((item, idx) => {
      const prefix = item.line.startsWith("#") ? "" : (hindi ? `लाइन ${item.number}। ` : `Line ${item.number}. `);
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
      scenes.push({mode:"output",zone:"right",lookAt:"output",resultLine:idx+1});
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

  // Always-visible floating menu: unlike the old inline section, it cannot be closed.
  showPanel();
  if(runButton){
    const actualRun=$("ppRun");
    if(actualRun){
      const mirror=()=>{runButton.disabled=actualRun.disabled;};
      mirror();
      new MutationObserver(mirror).observe(actualRun,{attributes:true,attributeFilter:["disabled"]});
    }
  }

  // Guided Run: approach Run, scan source lines, execute with the existing worker,
  // then travel to stdout and stderr and narrate their actual returned content.
  let quickRunActive=false;
  let runPreparation=false;
  let runToken=0;
  const runtimeStatus=$("ppStatus");
  function narrateFinishedRun(detail={}){
    const hindi=inHindi(),lang=language.value;
    const stdout=String(detail.stdout||"").trim();
    const stderr=String(detail.stderr||"").trim();
    const outRows=stdout&&stdout!=="(no stdout)"?
      stdout.split(/\r?\n/).filter(Boolean).slice(0,20):[];
    const errorRows=stderr.split(/\r?\n/).filter(Boolean);
    const lines=[],scenes=[];
    const push=(emotion,gesture,text,mode,zone,lookAt,sourceLine=null,resultLine=null)=>{
      lines.push(cue(emotion,gesture,lang,text));
      scenes.push({mode,zone,lookAt,sourceLine,resultLine});
    };
    push("explaining","point-right",
      hindi?"अब प्रोग्राम का आउटपुट देखते हैं।":"The program has finished. Let us look at the output.",
      "output","right","output");
    if(outRows.length){
      outRows.forEach((row,i)=>{
        push("explaining","point-right",
          (hindi?"आउटपुट "+(i+1)+": ":"Output "+(i+1)+": ")+safeLine(row),
          "output","right","output",null,i+1);
      });
      if(stdout.split(/\r?\n/).length>20)push("thinking","think",
        hindi?"बाकी आउटपुट स्क्रीन पर देखिए।":"Additional output remains visible on screen.",
        "output","right","output");
    }else{
      push("thinking","explain",
        hindi?"इस प्रोग्राम ने कोई प्रिंटेड आउटपुट नहीं दिया।":"This program produced no printed output.",
        "output","right","output");
    }
    if(stderr){
      const details=errorRows.at(-1)||"Python error";
      const match=[...stderr.matchAll(/\b([A-Za-z]+(?:Error|Exception))\b/g)].pop();
      const name=match?.[1]||"Python error";
      const lineMatch=[...stderr.matchAll(/File [^\n]*?, line (\d+)/g)].pop();
      const sourceLine=lineMatch?Number(lineMatch[1]):null;
      push("concerned","think",
        (hindi?"अब एरर पैनल देखते हैं। ":"Now let us inspect the error panel. ")+name+".",
        "error","right","error",sourceLine);
      push("explaining","point-right",
        (hindi?"एरर विवरण: ":"Error details: ")+safeLine(details),
        "error","right","error",sourceLine,Math.max(1,errorRows.length));
      push("encouraging","explain",
        hindi?"इस एरर को ठीक करने के लिए उस लाइन और उसके वेरिएबल देखें।":
          "Check the indicated line, its variables and the traceback to fix this error.",
        "error","right","error",sourceLine);
    }else{
      push("happy","celebrate",
        hindi?"एरर पैनल खाली है। प्रोग्राम बिना एरर के चला।":
          "The error panel is clear. No Python errors were reported.",
        "error","right","error");
    }
    queueNarration(lines,"Walking through the actual output and error results","output",scenes);
  }
  window.addEventListener("lwc-python:run-finished",event=>{
    if(!quickRunActive)return;
    quickRunActive=false;
    const detail=event.detail||{};
    stateLabel.textContent=detail.ok?"Run complete":"Run error";
    stateLabel.dataset.status=detail.ok?"finished":"error";
    narrateFinishedRun(detail);
  });
  async function guidedRun(){
    if(runPreparation||quickRunActive){
      hint.textContent="The program is already running.";
      return;
    }
    const run=$("ppRun");
    if(!run){hint.textContent="Python Run button is unavailable.";return;}
    const status=runtimeStatus?.textContent?.trim()||"";
    if(status==="Loading Python…"||status==="Running…"){
      hint.textContent="Python is not ready. Try again when it says Ready.";
      stateLabel.textContent="Not ready";stateLabel.dataset.status="error";
      return;
    }
    const id=++runToken;
    runPreparation=true;
    runButton.disabled=true;
    stateLabel.textContent="Walking to Run";stateLabel.dataset.status="walking";
    hint.textContent="Teacher walking to the Run button…";
    if(frameReady&&frame.contentWindow)
      frame.contentWindow.postMessage({type:"lwc-speaker:stop",version:2},SPEAKER_ORIGIN);
    try{
      if(walkOnPage?.checked){
        await walker?.walkToRun?.();
      }else run.scrollIntoView({behavior:"auto",block:"nearest"});
      if(id!==runToken)return;
      stateLabel.textContent="Scanning code";stateLabel.dataset.status="running";
      hint.textContent="Rapidly scrolling through the Python program…";
      if(walkOnPage?.checked){
        await walker?.scanCode?.();
      }else{
        const code=$("ppCode");
        if(code){
          code.scrollIntoView({behavior:"auto",block:"nearest"});
          code.scrollTop=Math.max(0,code.scrollHeight-code.clientHeight);
        }
      }
      if(id!==runToken)return;
      quickRunActive=true;
      stateLabel.textContent="Running";stateLabel.dataset.status="running";
      hint.textContent="Executing Python; reading stdout and errors after completion…";
      run.click();
    }catch(error){
      quickRunActive=false;
      stateLabel.textContent="Run problem";stateLabel.dataset.status="error";
      hint.textContent="Guided Run could not start. The editor Run button remains available.";
    }finally{
      runPreparation=false;
      runButton.disabled=run.disabled;
    }
  }
  // Drag the menu from its title bar without covering other controls.
  if(handle){
    let pointer=null;
    const bounds=()=>{const v=window.visualViewport;
      return {left:v?.offsetLeft||0,top:v?.offsetTop||0,
        width:v?.width||innerWidth,height:v?.height||innerHeight};};
    const clamp=(x,min,max)=>Math.min(Math.max(min,x),Math.max(min,max));
    const place=(left,top)=>{
      const v=bounds(),r=panel.getBoundingClientRect();
      const x=clamp(left,v.left+4,v.left+v.width-r.width-4);
      const y=clamp(top,v.top+4,v.top+v.height-r.height-4);
      panel.classList.add("speaker-dragged");
      panel.style.left=x+"px";panel.style.top=y+"px";
    };
    handle.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      const rect=panel.getBoundingClientRect();
      pointer={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
      try{handle.setPointerCapture(event.pointerId)}catch(_){}
    });
    handle.addEventListener("pointermove",event=>{
      if(!pointer||event.pointerId!==pointer.id)return;
      const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
      if(Math.abs(dx)+Math.abs(dy)>5)pointer.moved=true;
      if(pointer.moved)place(pointer.left+dx,pointer.top+dy);
    });
    const finish=event=>{
      if(pointer&&event.pointerId===pointer.id)pointer=null;
    };
    handle.addEventListener("pointerup",finish);
    handle.addEventListener("pointercancel",finish);
    const updateViewport=()=>{
      const v=bounds();
      const bottom=Math.max(0,innerHeight-(v.top+v.height));
      panel.style.setProperty("--speaker-vv-bottom",bottom+"px");
      if(panel.classList.contains("speaker-dragged")){
        const r=panel.getBoundingClientRect();place(r.left,r.top);
      }
    };
    window.addEventListener("resize",updateViewport,{passive:true});
    window.addEventListener("orientationchange",updateViewport,{passive:true});
    window.visualViewport?.addEventListener("resize",updateViewport,{passive:true});
    window.visualViewport?.addEventListener("scroll",updateViewport,{passive:true});
    settings?.addEventListener("toggle",updateViewport);
    updateViewport();
  }
  actions.forEach(button => button.addEventListener("click", () => {
    if (button.dataset.speakerAction === "comments") speakProgramComments(true);
    else if (button.dataset.speakerAction === "walk-demo") demoWalkAndTalk();
    else if (button.dataset.speakerAction === "code") explainCode();
    else if (button.dataset.speakerAction === "output") readOutput();
    else if (button.dataset.speakerAction === "error") explainError();
    else if (button.dataset.speakerAction === "run") guidedRun();
  }));
})();
