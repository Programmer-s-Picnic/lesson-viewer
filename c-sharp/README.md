# Learn With Champak — C# Online Editor

A static, GitHub Pages-friendly browser editor for C#.

## Features

- C# source editor with line numbers
- Run with `Ctrl+Enter`
- Standard input for `Console.ReadLine()`
- Output / compiler error console
- C# starter examples
- Autosave using `localStorage`
- Copy code
- Download as `Program.cs`
- Fullscreen mode
- Mobile-friendly layout
- SEO and Open Graph metadata
- Automatic execution backend fallback:
  1. Wandbox
  2. Judge0 public preview

## Run locally

Because browsers may restrict `fetch()` from `file://`, use a local web server.

### Python

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

### VS Code

You can also use the Live Server extension.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload all files from this folder to the repository root.
3. In GitHub: **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose `main` and `/ (root)`.
6. Save.

## Production note

The page is static, but C# must be compiled on a server-side sandbox. This package discovers a current C# compiler instead of hard-coding a version.

Public compiler services can have limits or downtime. For a large classroom/public product, self-host Judge0 or Wandbox and replace the API URLs in `app.js`.

## Files

- `index.html` — page + SEO
- `styles.css` — responsive UI
- `app.js` — editor behavior and execution logic
- `og-csharp-editor.png` — social preview image
