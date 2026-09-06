(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const editor = $("codeEditor");
  const stdin = $("stdin");
  const output = $("output");
  const lineNumbers = $("lineNumbers");
  const runBtn = $("runBtn");
  const stopBtn = $("stopBtn");
  const runStatus = $("runStatus");
  const saveStatus = $("saveStatus");
  const backendBadge = $("backendBadge");
  const exampleSelect = $("exampleSelect");

  const STORAGE_CODE = "lwc-csharp-editor-code-v1";
  const STORAGE_INPUT = "lwc-csharp-editor-stdin-v1";

  const examples = {
    hello: `using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Hello from Learn With Champak!");
    }
}`,
    input: `using System;

class Program
{
    static void Main()
    {
        Console.Write("What is your name? ");
        string name = Console.ReadLine() ?? "";

        Console.Write("Enter your age: ");
        int age = int.Parse(Console.ReadLine() ?? "0");

        Console.WriteLine($"Hello, {name}! Next year you will be {age + 1}.");
    }
}`,
    conditions: `using System;

class Program
{
    static void Main()
    {
        Console.Write("Enter marks: ");
        int marks = int.Parse(Console.ReadLine() ?? "0");

        if (marks >= 80)
            Console.WriteLine("Excellent");
        else if (marks >= 60)
            Console.WriteLine("Good");
        else if (marks >= 40)
            Console.WriteLine("Pass");
        else
            Console.WriteLine("Try again");
    }
}`,
    loops: `using System;

class Program
{
    static void Main()
    {
        Console.Write("Enter n: ");
        int n = int.Parse(Console.ReadLine() ?? "5");

        for (int i = 1; i <= n; i++)
        {
            for (int j = 1; j <= i; j++)
                Console.Write("* ");

            Console.WriteLine();
        }
    }
}`,
    functions: `using System;

class Program
{
    static int Square(int n)
    {
        return n * n;
    }

    static void Main()
    {
        Console.Write("Enter a number: ");
        int number = int.Parse(Console.ReadLine() ?? "0");
        Console.WriteLine($"Square = {Square(number)}");
    }
}`,
    dateclass: `using System;

class SimpleDate
{
    public int Day { get; }
    public int Month { get; }
    public int Year { get; }

    public SimpleDate(int day, int month, int year)
    {
        Day = day;
        Month = month;
        Year = year;
    }

    public override string ToString()
    {
        return $"{Day:00}/{Month:00}/{Year}";
    }
}

class Program
{
    static void Main()
    {
        SimpleDate courseDate = new SimpleDate(6, 9, 2026);
        Console.WriteLine($"Course date: {courseDate}");
    }
}`,
    currencyclass: `using System;

class Currency
{
    public decimal Amount { get; }
    public string Code { get; }

    public Currency(decimal amount, string code)
    {
        Amount = amount;
        Code = code.ToUpper();
    }

    public Currency Add(Currency other)
    {
        if (Code != other.Code)
            throw new InvalidOperationException("Currency codes must match.");

        return new Currency(Amount + other.Amount, Code);
    }

    public override string ToString()
    {
        return $"{Code} {Amount:0.00}";
    }
}

class Program
{
    static void Main()
    {
        Currency a = new Currency(250.50m, "INR");
        Currency b = new Currency(99.50m, "INR");
        Console.WriteLine(a.Add(b));
    }
}`
  };

  let controller = null;
  let wandboxCompiler = null;
  let judge0LanguageId = null;

  function setOutput(text, isError = false) {
    output.textContent = text || "(no output)";
    output.classList.toggle("error", isError);
  }

  function updateLineNumbers() {
    const count = editor.value.split("\n").length;
    lineNumbers.textContent = Array.from({ length: count }, (_, i) => i + 1).join("\n");
  }

  function syncScroll() {
    lineNumbers.scrollTop = editor.scrollTop;
  }

  function autosave() {
    localStorage.setItem(STORAGE_CODE, editor.value);
    localStorage.setItem(STORAGE_INPUT, stdin.value);
    saveStatus.textContent = "Saved";
    window.clearTimeout(autosave._timer);
    autosave._timer = window.setTimeout(() => saveStatus.textContent = "Autosaved", 900);
  }

  function setBusy(busy) {
    runBtn.disabled = busy;
    stopBtn.disabled = !busy;
    runStatus.textContent = busy ? "Running…" : "Ready";
  }

  function loadExample(key) {
    editor.value = examples[key] || examples.hello;
    stdin.value = key === "input" ? "Champak\n25" : key === "conditions" ? "72" : key === "loops" ? "5" : key === "functions" ? "8" : "";
    updateLineNumbers();
    autosave();
    editor.focus();
  }

  async function discoverWandboxCompiler(signal) {
    if (wandboxCompiler) return wandboxCompiler;

    const res = await fetch("https://wandbox.org/api/list.json", { signal });
    if (!res.ok) throw new Error(`Wandbox compiler list returned HTTP ${res.status}.`);

    const compilers = await res.json();
    const csharp = compilers.filter(c => {
      const lang = String(c.language || "").toLowerCase();
      return lang.includes("c#") || lang.includes("csharp") || lang.includes("c sharp");
    });

    if (!csharp.length) throw new Error("No C# compiler is currently advertised by Wandbox.");

    function score(c) {
      const name = String(c.name || "").toLowerCase();
      const version = String(c.version || "").toLowerCase();
      let s = 0;
      if (name.includes("dotnet")) s += 100;
      if (name.includes("mono")) s += 80;
      if (name.includes("head")) s += 20;
      if (version.includes("head")) s += 10;
      return s;
    }

    csharp.sort((a, b) => score(b) - score(a));
    wandboxCompiler = csharp[0].name;
    return wandboxCompiler;
  }

  async function runWithWandbox(code, input, signal) {
    const compiler = await discoverWandboxCompiler(signal);
    backendBadge.textContent = `Backend: Wandbox / ${compiler}`;

    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        code,
        compiler,
        stdin: input,
        options: "",
        "compiler-option-raw": "",
        "runtime-option-raw": ""
      })
    });

    if (!res.ok) throw new Error(`Wandbox returned HTTP ${res.status}.`);
    const data = await res.json();

    const compilerText = [
      data.compiler_output,
      data.compiler_message
    ].filter(Boolean).join("\n").trim();

    const programText = [
      data.program_output,
      data.program_message
    ].filter(Boolean).join("\n").trim();

    const text = [compilerText, programText].filter(Boolean).join("\n").trim();
    const failed = Boolean(compilerText) || (data.status && data.status !== "0");

    return {
      text: text || "(program finished with no output)",
      failed
    };
  }

  async function discoverJudge0Language(signal) {
    if (judge0LanguageId) return judge0LanguageId;

    const res = await fetch("https://ce.judge0.com/languages/", { signal });
    if (!res.ok) throw new Error(`Judge0 language list returned HTTP ${res.status}.`);
    const langs = await res.json();

    const exact = langs.find(x => /^c#\s*\(/i.test(String(x.name || "")));
    const fallback = langs.find(x => /c#|csharp|c sharp/i.test(String(x.name || "")));
    const chosen = exact || fallback;

    if (!chosen) throw new Error("No C# language is currently advertised by Judge0.");
    judge0LanguageId = chosen.id;
    return judge0LanguageId;
  }

  async function pollJudge0(token, signal) {
    for (let i = 0; i < 18; i++) {
      const res = await fetch(
        `https://ce.judge0.com/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,time,memory`,
        { signal }
      );
      if (!res.ok) throw new Error(`Judge0 polling returned HTTP ${res.status}.`);
      const data = await res.json();
      const id = data.status && data.status.id;
      if (id !== 1 && id !== 2) return data;
      await new Promise(r => setTimeout(r, 450));
    }
    throw new Error("Judge0 execution timed out while waiting for a result.");
  }

  async function runWithJudge0(code, input, signal) {
    const languageId = await discoverJudge0Language(signal);
    backendBadge.textContent = `Backend: Judge0 / C# (${languageId})`;

    let res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: input
      })
    });

    if (!res.ok) throw new Error(`Judge0 returned HTTP ${res.status}.`);
    let data = await res.json();

    if (data.token && (!data.status || data.status.id === 1 || data.status.id === 2)) {
      data = await pollJudge0(data.token, signal);
    }

    const parts = [
      data.compile_output,
      data.stderr,
      data.stdout,
      data.message
    ].filter(Boolean);

    const statusId = data.status && data.status.id;
    return {
      text: parts.join("\n").trim() || "(program finished with no output)",
      failed: Boolean(statusId && statusId !== 3)
    };
  }

  async function runCode() {
    if (controller) controller.abort();
    controller = new AbortController();
    setBusy(true);
    setOutput("Compiling and running…");
    output.classList.remove("error");

    const code = editor.value;
    const input = stdin.value;
    const errors = [];

    try {
      try {
        const result = await runWithWandbox(code, input, controller.signal);
        setOutput(result.text, result.failed);
        runStatus.textContent = result.failed ? "Finished with errors" : "Finished";
        return;
      } catch (err) {
        if (err.name === "AbortError") throw err;
        errors.push(`Wandbox: ${err.message}`);
      }

      try {
        const result = await runWithJudge0(code, input, controller.signal);
        setOutput(result.text, result.failed);
        runStatus.textContent = result.failed ? "Finished with errors" : "Finished";
        return;
      } catch (err) {
        if (err.name === "AbortError") throw err;
        errors.push(`Judge0: ${err.message}`);
      }

      throw new Error(errors.join("\n"));
    } catch (err) {
      if (err.name === "AbortError") {
        setOutput("Execution cancelled.");
        runStatus.textContent = "Cancelled";
      } else {
        setOutput(
          "Unable to reach a C# execution backend.\n\n" +
          err.message +
          "\n\nThe editor itself is still working. If this is a production classroom site, use your own Judge0/Wandbox-compatible execution service for guaranteed availability.",
          true
        );
        runStatus.textContent = "Backend unavailable";
        backendBadge.textContent = "Backend: unavailable";
      }
    } finally {
      setBusy(false);
      controller = null;
    }
  }

  function downloadProgram() {
    const blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Program.cs";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(editor.value);
      $("copyBtn").textContent = "Copied";
      setTimeout(() => $("copyBtn").textContent = "Copy", 900);
    } catch {
      editor.select();
      document.execCommand("copy");
    }
  }

  function insertTab(e) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("    ", start, end, "end");
    updateLineNumbers();
    autosave();
  }

  editor.addEventListener("input", () => {
    updateLineNumbers();
    autosave();
  });
  editor.addEventListener("scroll", syncScroll);
  editor.addEventListener("keydown", (e) => {
    insertTab(e);
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCode();
    }
  });

  stdin.addEventListener("input", autosave);

  $("runBtn").addEventListener("click", runCode);
  $("stopBtn").addEventListener("click", () => controller && controller.abort());
  $("loadExampleBtn").addEventListener("click", () => loadExample(exampleSelect.value));
  $("resetBtn").addEventListener("click", () => {
    if (confirm("Reset the editor to Hello World?")) loadExample("hello");
  });
  $("copyBtn").addEventListener("click", copyCode);
  $("downloadBtn").addEventListener("click", downloadProgram);
  $("clearInputBtn").addEventListener("click", () => {
    stdin.value = "";
    autosave();
  });
  $("clearOutputBtn").addEventListener("click", () => setOutput("Output cleared."));
  $("fullscreenBtn").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        document.body.classList.add("fullscreen-editor");
        $("fullscreenBtn").textContent = "Exit Fullscreen";
      } else {
        await document.exitFullscreen();
      }
    } catch {
      document.body.classList.toggle("fullscreen-editor");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove("fullscreen-editor");
      $("fullscreenBtn").textContent = "Fullscreen";
    }
  });

  const savedCode = localStorage.getItem(STORAGE_CODE);
  const savedInput = localStorage.getItem(STORAGE_INPUT);
  editor.value = savedCode || examples.hello;
  stdin.value = savedInput || "";
  updateLineNumbers();
})();
