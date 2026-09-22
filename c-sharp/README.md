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


## NuGet package manager

The toolbar now accepts either:

- `Microsoft.Data.SqlClient`
- `Microsoft.Data.SqlClient@6.1.1`

The editor checks NuGet.org, stores the selected package/version locally, and includes it in the generated `CSharpEditor.csproj`.

Public browser execution through Wandbox/Judge0 does **not** run `dotnet restore` for arbitrary packages. Use **Download project ZIP**, then:

```bash
dotnet restore
dotnet run
```

For true in-browser package execution, connect the editor to a custom .NET execution backend that runs restore/build/run in an isolated sandbox.


## SQL Server Simulator

Use the **SQL Server Simulator** button, then **Load CRUD example**. It simulates `Microsoft.Data.SqlClient` for `CricketDB / Cricketer_Scores(playername, runs)` and persists rows in the browser. It supports INSERT, SELECT, UPDATE, DELETE, parameters, readers, and basic scalar queries. This is a teaching simulator, not a real SQL Server connection.

## Share title

Enter a **Share title** in the hero. Shared links carry the title, code, stdin, compiler, package list, SQL simulator state, and simulated table rows. The shared title appears when the recipient opens the link.


## Dynamic SQL Server simulator

The simulator is no longer tied to `Cricketer_Scores`.

You can create a table from the UI with definitions such as:

```text
studentid INT PRIMARY KEY
studentname VARCHAR(100) NOT NULL
marks INT
```

or create it from C#:

```csharp
using SqlConnection con = new SqlConnection(connectionString);
con.Open();

using SqlCommand cmd = new SqlCommand(@"
    CREATE TABLE Students
    (
        studentid INT PRIMARY KEY,
        studentname VARCHAR(100) NOT NULL,
        marks INT
    )", con);

cmd.ExecuteNonQuery();
```

The simulator persists database name, table schemas and rows in the browser.

Supported simulated SQL:

- `CREATE DATABASE`
- `CREATE TABLE`
- `DROP TABLE`
- `INSERT INTO ...`
- `SELECT ... FROM ...`
- equality `WHERE`
- `ORDER BY`
- `UPDATE ... SET ...`
- `DELETE FROM ...`
- `COUNT(*)`
- `SUM(column)`
- `MIN(column)`
- `MAX(column)`

The `Cricketer_Scores` table is now only an optional sample created from the simulator panel.
