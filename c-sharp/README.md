# Learn With Champak — C# Online Editor

A classroom-ready, GitHub Pages-friendly C# editor using the same VS-style workflow as the Learn With Champak Python editor.

## Included

- VS Code-style activity bar, Explorer, editor, bottom panel and status bar
- Light/dark theme using the same warm light theme + dark IDE layout
- Multi-file `.cs` tabs
- Real multi-file C# compilation through Wandbox `codes` support
- Automatic C# compiler discovery (no hard-coded compiler version)
- Judge0 C# single-file fallback
- Standard input / stdout / compiler errors
- Run / Stop / execution timeout / timer metadata
- C# syntax highlighting with line numbers
- Auto-indent, bracket/quote pairing, Tab/Shift+Tab, Ctrl+/ comment, Ctrl+Enter run
- Font-size control
- Focused code fullscreen, full application fullscreen and expandable I/O panels
- Built-in examples: Hello World, input/output, conditions, loops, functions, OOP, formatting, LINQ and async/await
- Project title, author, description and tags
- Student name and roll/ID saved locally
- Shareable URL-hash projects
- Download active `.cs` file
- Export complete project ZIP
- Project asset upload/download using IndexedDB
- Text/CSV/JSON asset files can be supplied to the Wandbox project when supported by the remote compiler environment
- NuGet PackageReference metadata
- `.csproj` export (`net8.0`)
- Problem bank (`problems.json`)
- Sample tests and hidden tests
- Run samples / run all tests
- Hints, daily problem selector, XP and streak
- Teacher mode: `?tmode=1`
- Classroom mode, exam mode, locked problem, attempt limit and NuGet policy
- Local submission capture + JSON export
- Voice commands when browser SpeechRecognition is available
- Optional speech synthesis for stdout / errors
- Draggable sidebar width and output-panel height
- Top/bottom learning sections can be hidden and remember their state
- Remote loaders:
  - `?problems=URL`
  - `?codefile=URL`
  - `?code=URL`
- `builder.html` for creating C# coding problems and auto-generating expected output from a reference solution
- SEO, Open Graph image, site header/footer include hooks, analytics and existing Learn With Champak site scripts

## Execution backend

The static site itself can be hosted on GitHub Pages. C# compilation requires a sandboxed execution service.

The editor tries:

1. **Wandbox** — current C# compiler list is discovered dynamically. This is the preferred backend because Wandbox supports additional source files.
2. **Judge0 CE** — fallback for the active/single main source file.

The public services may impose quotas, change availability or be unsuitable for a busy classroom deployment. For production scale, self-host an execution backend and adapt `execute()` in `app.js`.

## NuGet note

NuGet packages entered in the sidebar are **project metadata**. They are written into the exported `.csproj` and project ZIP. The free remote compiler is not guaranteed to perform `dotnet restore` for arbitrary packages.

For packages, use the exported project locally:

```bash
dotnet restore
dotnet run
```

or open the repository in VS Code / GitHub Codespaces.

## GitHub Pages

Upload these files to a repository:

```text
index.html
style.css
app.js
problems.json
builder.html
builder.js
og-csharp-editor.png
README.md
```

Then enable:

**Repository → Settings → Pages → Deploy from a branch → main → /(root)**

## Teacher / Student

Teacher:

```text
index.html?tmode=1
```

Student:

```text
index.html?tmode=0
```

Teacher submissions in this static version are stored in the **same browser's localStorage**. They are not centrally collected from other student devices. A server/worker endpoint is required for centralized classroom submissions.

## Problem JSON

Use `builder.html` or follow the structure in `problems.json`.

```json
{
  "id": "sum_n",
  "title": "Sum of First N Numbers",
  "level": "Easy",
  "statement": "Given N, print the sum...",
  "starter": "using System; ...",
  "examples": [{"input":"5\n","output":"15\n"}],
  "tests": [{"input":"100\n","output":"5050\n","hidden":true}],
  "hints": ["Use the formula..."],
  "tags": ["math", "formula"]
}
```

## Remote code JSON

Supported forms:

```json
{"code":"using System; ..."}
```

```json
{
  "tabs":[{"name":"Program.cs","code":"..."},{"name":"Person.cs","code":"..."}],
  "currentTab":0,
  "stdin":"Champak\n",
  "problem":"sum_n"
}
```

or an array of files:

```json
[{"name":"Program.cs","code":"..."}]
```
