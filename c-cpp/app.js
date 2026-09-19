(() => {
  'use strict';

  const STORAGE = {
    language: 'lwc_cpp_ide_language',
    codeC: 'lwc_cpp_ide_code_c',
    codeCpp: 'lwc_cpp_ide_code_cpp',
    stdin: 'lwc_cpp_ide_stdin',
    theme: 'lwc_cpp_ide_theme',
    api: 'lwc_cpp_ide_api',
    fontSize: 'lwc_cpp_ide_font_size'
  };

  const LANGUAGES = {
    c: { judge0Id: 103, filename: 'main.c', aceMode: 'ace/mode/c_cpp' },
    cpp: { judge0Id: 105, filename: 'main.cpp', aceMode: 'ace/mode/c_cpp' }
  };

  const samples = {
    c: {
      hello: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello from Learn With Champak!\\n");\n    return 0;\n}\n`,
      input: `#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    printf("Enter two numbers: ");\n    scanf("%d %d", &a, &b);\n    printf("Sum = %d\\n", a + b);\n    return 0;\n}\n`,
      loop: `#include <stdio.h>\n\nint main(void) {\n    for (int i = 1; i <= 10; i++) {\n        printf("%d ", i);\n    }\n    printf("\\n");\n    return 0;\n}\n`,
      array: `#include <stdio.h>\n\nint main(void) {\n    int a[] = {10, 20, 30, 40, 50};\n    int n = sizeof(a) / sizeof(a[0]);\n\n    for (int i = 0; i < n; i++) {\n        printf("%d ", a[i]);\n    }\n    printf("\\n");\n    return 0;\n}\n`,
      function: `#include <stdio.h>\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint main(void) {\n    printf("%d\\n", add(7, 5));\n    return 0;\n}\n`,
      class: `#include <stdio.h>\n\nint main(void) {\n    printf("Classes are a C++ feature. Switch Language to C++.\\n");\n    return 0;\n}\n`
    },
    cpp: {
      hello: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from Learn With Champak!" << endl;\n    return 0;\n}\n`,
      input: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cout << "Enter two numbers: ";\n    cin >> a >> b;\n    cout << "Sum = " << a + b << endl;\n    return 0;\n}\n`,
      loop: `#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 10; i++) {\n        cout << i << ' ';\n    }\n    cout << endl;\n    return 0;\n}\n`,
      array: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a[] = {10, 20, 30, 40, 50};\n    for (int value : a) {\n        cout << value << ' ';\n    }\n    cout << endl;\n    return 0;\n}\n`,
      function: `#include <iostream>\nusing namespace std;\n\nint add(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    cout << add(7, 5) << endl;\n    return 0;\n}\n`,
      class: `#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Student {\npublic:\n    string name;\n\n    void greet() const {\n        cout << "Hello, " << name << "!" << endl;\n    }\n};\n\nint main() {\n    Student s;\n    s.name = "Champak";\n    s.greet();\n    return 0;\n}\n`
    }
  };

  const $ = id => document.getElementById(id);
  const els = {
    language: $('languageSelect'), sample: $('sampleSelect'), stdin: $('stdin'), output: $('output'),
    run: $('runBtn'), newBtn: $('newBtn'), download: $('downloadBtn'), copy: $('copyBtn'),
    clearInput: $('clearInputBtn'), clearOutput: $('clearOutputBtn'), theme: $('themeBtn'),
    saveStatus: $('saveStatus'), runMeta: $('runMeta'), compilerStatus: $('compilerStatus'),
    settings: $('settingsBtn'), settingsDialog: $('settingsDialog'), apiUrl: $('apiUrl'),
    resetApi: $('resetApiBtn'), saveApi: $('saveApiBtn'), toast: $('toast'),
    fontDown: $('fontDownBtn'), fontUp: $('fontUpBtn'), fallback: $('fallbackEditor')
  };

  let editor = null;
  let usingFallback = false;
  let saveTimer = null;
  let running = false;
  let fontSize = Number(localStorage.getItem(STORAGE.fontSize) || 16);
  let activeLanguage = localStorage.getItem(STORAGE.language) || 'cpp';

  const getLanguage = () => els.language.value;
  const codeKeyFor = language => language === 'c' ? STORAGE.codeC : STORAGE.codeCpp;
  const getCodeKey = () => codeKeyFor(getLanguage());
  const defaultApi = 'https://ce.judge0.com';
  const getApi = () => (localStorage.getItem(STORAGE.api) || defaultApi).replace(/\/+$/, '');

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 1800);
  }

  function setCompilerState(state, text) {
    els.compilerStatus.innerHTML = `<span class="dot ${state === 'busy' ? 'busy' : state === 'error' ? 'error' : ''}"></span>${text}`;
  }

  function setOutput(text, type = '') {
    els.output.textContent = text;
    els.output.classList.remove('error', 'success');
    if (type) els.output.classList.add(type);
  }

  function setCode(value) {
    if (editor) editor.setValue(value, -1);
    else els.fallback.value = value;
  }

  function getCode() {
    return editor ? editor.getValue() : els.fallback.value;
  }

  function saveDraft() {
    localStorage.setItem(getCodeKey(), getCode());
    localStorage.setItem(STORAGE.stdin, els.stdin.value);
    els.saveStatus.textContent = 'Saved locally';
  }

  function queueSave() {
    els.saveStatus.textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 350);
  }

  function loadDraftForLanguage() {
    const language = getLanguage();
    const stored = localStorage.getItem(getCodeKey());
    setCode(stored || samples[language].hello);
    if (editor) editor.session.setMode(LANGUAGES[language].aceMode);
  }

  function initEditor() {
    if (window.ace) {
      ace.config.set('basePath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.44.0/src-min-noconflict/');
      editor = ace.edit('editor');
      editor.session.setMode('ace/mode/c_cpp');
      editor.setTheme(document.documentElement.dataset.theme === 'dark' ? 'ace/theme/one_dark' : 'ace/theme/textmate');
      editor.setOptions({
        fontSize: `${fontSize}px`,
        showPrintMargin: false,
        wrap: false,
        tabSize: 4,
        useSoftTabs: true,
        highlightActiveLine: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: false,
        enableSnippets: true
      });
      editor.commands.addCommand({
        name: 'runCode',
        bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
        exec: runCode
      });
      editor.session.on('change', queueSave);
    } else {
      usingFallback = true;
      $('editor').style.display = 'none';
      els.fallback.style.display = 'block';
      els.fallback.style.fontSize = `${fontSize}px`;
      els.fallback.addEventListener('input', queueSave);
      els.fallback.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          runCode();
        }
        if (event.key === 'Tab') {
          event.preventDefault();
          const start = els.fallback.selectionStart;
          const end = els.fallback.selectionEnd;
          els.fallback.value = els.fallback.value.slice(0, start) + '    ' + els.fallback.value.slice(end);
          els.fallback.selectionStart = els.fallback.selectionEnd = start + 4;
          queueSave();
        }
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE.theme, theme);
    els.theme.textContent = theme === 'dark' ? '☀' : '☾';
    els.theme.setAttribute('aria-label', theme === 'dark' ? 'Use light theme' : 'Use dark theme');
    if (editor) editor.setTheme(theme === 'dark' ? 'ace/theme/one_dark' : 'ace/theme/textmate');
  }

  function changeFont(delta) {
    fontSize = Math.max(12, Math.min(28, fontSize + delta));
    localStorage.setItem(STORAGE.fontSize, String(fontSize));
    if (editor) editor.setFontSize(fontSize);
    els.fallback.style.fontSize = `${fontSize}px`;
    toast(`Editor font: ${fontSize}px`);
  }

  function downloadSource() {
    const lang = getLanguage();
    const blob = new Blob([getCode()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = LANGUAGES[lang].filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(getCode());
      toast('Code copied');
    } catch {
      const temp = document.createElement('textarea');
      temp.value = getCode();
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
      toast('Code copied');
    }
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function createSubmission(api, payload) {
    const response = await fetch(`${api}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Submission failed (${response.status}). ${text.slice(0, 300)}`);
    }
    return response.json();
  }

  async function pollSubmission(api, token) {
    const fields = 'stdout,stderr,compile_output,message,status,time,memory';
    for (let attempt = 0; attempt < 35; attempt++) {
      const response = await fetch(`${api}/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=${fields}`);
      if (!response.ok) throw new Error(`Could not read result (${response.status}).`);
      const result = await response.json();
      const id = result.status && result.status.id;
      if (id !== 1 && id !== 2) return result;
      await sleep(attempt < 5 ? 450 : 700);
    }
    throw new Error('Execution is taking too long. Please try again.');
  }

  function renderResult(result) {
    const status = result.status?.description || 'Finished';
    const compile = result.compile_output || '';
    const stderr = result.stderr || '';
    const stdout = result.stdout || '';
    const message = result.message || '';
    const hasError = Boolean(compile || stderr || (result.status?.id && result.status.id !== 3));

    let text = '';
    if (compile) text += `Compilation output:\n${compile.trimEnd()}\n`;
    if (stderr) text += `${text ? '\n' : ''}Runtime error:\n${stderr.trimEnd()}\n`;
    if (stdout) text += `${text ? '\n' : ''}${stdout.trimEnd()}\n`;
    if (message && !text) text = message;
    if (!text) text = status;

    setOutput(text, hasError ? 'error' : 'success');
    const bits = [status];
    if (result.time) bits.push(`${result.time}s`);
    if (result.memory) bits.push(`${Math.round(result.memory / 1024)} MB`);
    els.runMeta.textContent = bits.join(' • ');
    setCompilerState(hasError ? 'error' : 'ready', hasError ? status : 'Execution complete');
  }

  async function runCode() {
    if (running) return;
    const code = getCode().trim();
    if (!code) {
      setOutput('Write some C or C++ code first.', 'error');
      return;
    }

    running = true;
    els.run.disabled = true;
    els.run.textContent = 'Running…';
    els.runMeta.textContent = 'Compiling…';
    setOutput('Compiling and running…');
    setCompilerState('busy', 'Compiler working');
    saveDraft();

    try {
      const api = getApi();
      const payload = {
        language_id: LANGUAGES[getLanguage()].judge0Id,
        source_code: getCode(),
        stdin: els.stdin.value,
        cpu_time_limit: 3,
        wall_time_limit: 8
      };
      const created = await createSubmission(api, payload);
      if (!created.token) throw new Error(created.error || 'Compiler did not return a submission token.');
      const result = await pollSubmission(api, created.token);
      renderResult(result);
    } catch (error) {
      console.error(error);
      setOutput(
        `Could not run the program.\n\n${error.message}\n\nCheck your internet connection or open Compiler settings and use another Judge0-compatible API endpoint.`,
        'error'
      );
      els.runMeta.textContent = 'Run failed';
      setCompilerState('error', 'Compiler unavailable');
    } finally {
      running = false;
      els.run.disabled = false;
      els.run.textContent = '▶ Run';
    }
  }

  function bindEvents() {
    els.language.addEventListener('change', () => {
      localStorage.setItem(codeKeyFor(activeLanguage), getCode());
      activeLanguage = getLanguage();
      localStorage.setItem(STORAGE.language, activeLanguage);
      if (activeLanguage === 'c' && els.sample.value === 'class') els.sample.value = 'hello';
      loadDraftForLanguage();
      toast(activeLanguage === 'c' ? 'C selected' : 'C++ selected');
    });

    els.sample.addEventListener('change', () => {
      const lang = getLanguage();
      setCode(samples[lang][els.sample.value]);
      saveDraft();
    });

    els.stdin.addEventListener('input', queueSave);
    els.run.addEventListener('click', runCode);
    els.download.addEventListener('click', downloadSource);
    els.copy.addEventListener('click', copyCode);
    els.clearInput.addEventListener('click', () => { els.stdin.value = ''; queueSave(); els.stdin.focus(); });
    els.clearOutput.addEventListener('click', () => { setOutput(''); els.runMeta.textContent = 'Ready'; });
    els.theme.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    els.fontDown.addEventListener('click', () => changeFont(-1));
    els.fontUp.addEventListener('click', () => changeFont(1));

    els.newBtn.addEventListener('click', () => {
      const lang = getLanguage();
      setCode(samples[lang].hello);
      els.stdin.value = '';
      setOutput('New program ready.');
      els.runMeta.textContent = 'Ready';
      saveDraft();
    });

    els.settings.addEventListener('click', () => {
      els.apiUrl.value = getApi();
      els.settingsDialog.showModal();
    });
    els.resetApi.addEventListener('click', () => { els.apiUrl.value = defaultApi; });
    els.saveApi.addEventListener('click', () => {
      const value = els.apiUrl.value.trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(value)) {
        toast('Enter a valid http/https URL');
        return;
      }
      localStorage.setItem(STORAGE.api, value);
      els.settingsDialog.close();
      setCompilerState('ready', 'Compiler ready');
      toast('Compiler endpoint saved');
    });

    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !editor) {
        event.preventDefault();
        runCode();
      }
    });

    window.addEventListener('beforeunload', saveDraft);
  }

  function boot() {
    const savedTheme = localStorage.getItem(STORAGE.theme) || 'light';
    document.documentElement.dataset.theme = savedTheme;
    els.language.value = activeLanguage;
    els.stdin.value = localStorage.getItem(STORAGE.stdin) || '';
    els.apiUrl.value = getApi();
    initEditor();
    applyTheme(savedTheme);
    loadDraftForLanguage();
    bindEvents();
    if (usingFallback) toast('Ace could not load — basic editor mode active');
  }

  boot();
})();
