# Programmer's Picnic — C# Editor

This is the simplified C# editor that follows the same visual design as the current Programmer's Picnic Python editor.

## Kept

- Warm light theme and matching dark theme
- Hero + quick-start cards
- Compact sticky toolbar
- Run / Stop / Clear output
- Full screen
- Font size control
- C# compiler discovery
- Download `Program.cs`
- Shareable code + stdin link
- Read stdout / stderr aloud
- C# syntax highlighting
- Line numbers
- Auto indent
- Bracket and quote pairs
- Tab / Shift+Tab indent-outdent
- Ctrl+/ comment toggle
- stdin / stdout / stderr panels
- Expandable code and IO panels
- Browser-local project file upload/download
- Download uploaded files as ZIP
- Programmer's Picnic header/footer includes
- SEO / Open Graph image

## Removed

The large classroom/VS Code shell was intentionally removed: no job-opportunity blocks, activity bar, sidebar, teacher mode, problem judge, XP/streak, project metadata, NuGet panel, problem builder or classroom panels.

## C# execution

The page first tries Wandbox and automatically discovers a current C# compiler. If that run cannot be reached, it falls back to the public Judge0 CE endpoint.

Because this is a static browser page, uploaded browser files are not mounted into the remote compiler runtime. They are stored locally for download/reference.

## GitHub Pages

Upload these files to the target folder:

- `index.html`
- `style.css`
- `app.js`
- `og-csharp-editor.png`

The included `/assets/js/pp-includes.js`, `/header.html`, and `/footer.html` references assume the existing Learn With Champak / Programmer's Picnic site structure.
