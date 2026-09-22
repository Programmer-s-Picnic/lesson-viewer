(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ui = {
    app: $("appShell"),
    codeCard: document.querySelector(".codeCard"),
    codeFullscreen: $("ppCodeFullscreen"),
    code: $("ppCode"),
    highlight: $("ppHighlight"),
    gutter: $("ppGutter"),
    stdin: $("ppStdin"),
    out: $("ppOut"),
    err: $("ppErr"),
    run: $("ppRun"),
    stop: $("ppStop"),
    clear: $("ppClear"),
    font: $("ppFontSize"),
    fullscreenButtons: Array.from(document.querySelectorAll(".jsFullscreen")),
    share: $("ppShare"),
    shareTitle: $("ppShareTitle"),
    sharedTitleMessage: $("ppSharedTitleMessage"),
    theme: $("ppTheme"),
    compiler: $("ppCompiler"),
    refreshCompiler: $("ppRefreshCompiler"),
    downloadCode: $("ppDownloadCode"),
    downloadCsproj: $("ppDownloadCsproj"),
    downloadProject: $("ppDownloadProject"),
    nugetPackage: $("ppNugetPackage"),
    installPackage: $("ppInstallPackage"),
    togglePackages: $("ppTogglePackages"),
    closePackages: $("ppClosePackages"),
    packagePanel: $("ppPackagePanel"),
    packageList: $("ppPackageList"),
    toggleSqlSim: $("ppToggleSqlSim"),
    sqlSimPanel: $("ppSqlSimPanel"),
    sqlSimEnabled: $("ppSqlSimEnabled"),
    sqlLoadExample: $("ppSqlLoadExample"),
    sqlSample: $("ppSqlSample"),
    sqlClose: $("ppSqlClose"),
    sqlDbName: $("ppSqlDbName"),
    sqlTableSelect: $("ppSqlTableSelect"),
    sqlToggleCreate: $("ppSqlToggleCreate"),
    sqlDropTable: $("ppSqlDropTable"),
    sqlCreateBox: $("ppSqlCreateBox"),
    sqlNewTableName: $("ppSqlNewTableName"),
    sqlColumnDefs: $("ppSqlColumnDefs"),
    sqlCreateTable: $("ppSqlCreateTable"),
    sqlCopyCreate: $("ppSqlCopyCreate"),
    sqlSchema: $("ppSqlSchema"),
    sqlDataHead: $("ppSqlDataHead"),
    sqlRows: $("ppSqlRows"),
    sqlEmpty: $("ppSqlEmpty"),
    readOutput: $("ppReadOutput"),
    status: $("ppStatus"),
    toast: $("ppToast"),
    copyOut: $("ppCopyOut"),
    fileInput: $("ppFileInput"),
    uploadFiles: $("ppUploadFiles"),
    refreshFiles: $("ppRefreshFiles"),
    downloadAllFiles: $("ppDownloadAllFiles"),
    fileList: $("ppFileList")
  };

  const K_CODE = "pp_csharp_code_v2";
  const K_STDIN = "pp_csharp_stdin_v2";
  const K_FONT = "pp_csharp_font_v2";
  const K_THEME = "pp_csharp_theme_v2";
  const K_COMPILER = "pp_csharp_compiler_v2";
  const K_READ_OUTPUT = "pp_csharp_read_output_v2";
  const K_PACKAGES = "pp_csharp_packages_v1";
  const K_SHARE_TITLE = "pp_csharp_share_title_v1";
  const K_SQLSIM_ENABLED = "pp_csharp_sqlsim_enabled_v1";
  const K_SQLSIM_DB = "pp_csharp_sqlsim_db_v1";
  const DB_NAME = "pp_csharp_editor_files_v1";
  const DB_STORE = "files";

  let controller = null;
  let running = false;
  let runTimer = null;
  let compilerRows = [];
  let judge0LanguageId = null;
  let projectFiles = [];
  let installedPackages = [];
  let dbPromise = null;
  let highlightSyncFrame = 0;

  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ui.toast.classList.remove("show"), 1700);
  }

  function setStatus(msg, kind = "") {
    ui.status.textContent = msg;
    ui.status.className = "status " + kind;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
  }

  function save() {
    localStorage.setItem(K_CODE, ui.code.value);
    localStorage.setItem(K_STDIN, ui.stdin.value);
    if (ui.shareTitle) localStorage.setItem(K_SHARE_TITLE, ui.shareTitle.value);
  }

  function formatFileSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ---------- NuGet packages ----------
  function loadPackages() {
    try {
      const rows = JSON.parse(localStorage.getItem(K_PACKAGES) || "[]");
      installedPackages = Array.isArray(rows) ? rows.filter(x => x && x.id && x.version) : [];
    } catch {
      installedPackages = [];
    }
    renderPackages();
  }

  function savePackages() {
    localStorage.setItem(K_PACKAGES, JSON.stringify(installedPackages));
    renderPackages();
  }

  function renderPackages() {
    if (!ui.packageList || !ui.togglePackages) return;
    ui.togglePackages.textContent = `Packages (${installedPackages.length})`;
    if (!installedPackages.length) {
      ui.packageList.innerHTML = '<p class="emptyFiles">No NuGet packages installed.</p>';
      return;
    }
    ui.packageList.innerHTML = installedPackages.map(pkg => `
      <div class="packageRow">
        <span class="packageName" title="${escapeAttr(pkg.id)}">${escapeHtml(pkg.id)}</span>
        <span class="packageVersion">${escapeHtml(pkg.version)}</span>
        <button class="miniBtn" data-package-remove="${escapeAttr(pkg.id)}" type="button">Remove</button>
      </div>`).join("");
  }

  function parsePackageSpec(raw) {
    const text = String(raw || "").trim();
    if (!text) throw new Error("Type a NuGet package name.");
    const at = text.lastIndexOf("@");
    if (at > 0) {
      return { id: text.slice(0, at).trim(), version: text.slice(at + 1).trim() };
    }
    return { id: text, version: "" };
  }

  async function getNugetVersions(id) {
    const packageId = encodeURIComponent(String(id).toLowerCase());
    const url = `https://api.nuget.org/v3-flatcontainer/${packageId}/index.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Package "${id}" was not found on NuGet.org.`);
      throw new Error(`NuGet.org returned HTTP ${res.status}.`);
    }
    const data = await res.json();
    const versions = Array.isArray(data.versions) ? data.versions : [];
    if (!versions.length) throw new Error(`No versions found for "${id}".`);
    return versions;
  }

  function latestStableVersion(versions) {
    const stable = versions.filter(v => !String(v).includes("-"));
    return (stable.length ? stable : versions).at(-1);
  }

  async function installNugetPackage() {
    let spec;
    try { spec = parsePackageSpec(ui.nugetPackage.value); }
    catch (err) { return toast(err.message); }

    ui.installPackage.disabled = true;
    setStatus(`Checking ${spec.id}…`);
    try {
      const versions = await getNugetVersions(spec.id);
      const version = spec.version || latestStableVersion(versions);
      const exact = versions.find(v => v.toLowerCase() === String(version).toLowerCase());
      if (!exact) throw new Error(`Version ${version} was not found for ${spec.id}.`);

      const existing = installedPackages.findIndex(p => p.id.toLowerCase() === spec.id.toLowerCase());
      const row = { id: spec.id, version: exact };
      if (existing >= 0) installedPackages[existing] = row;
      else installedPackages.push(row);

      installedPackages.sort((a, b) => a.id.localeCompare(b.id));
      savePackages();
      ui.nugetPackage.value = "";
      ui.packagePanel.hidden = false;
      setStatus(`${spec.id} ${exact} added`, "ok");
      toast(`${spec.id} ${exact} added`);
    } catch (err) {
      setStatus("Package not added", "bad");
      toast(err.message || "Could not add package");
    } finally {
      ui.installPackage.disabled = false;
    }
  }

  function makeCsproj() {
    const refs = installedPackages.map(pkg =>
      `    <PackageReference Include="${escapeXml(pkg.id)}" Version="${escapeXml(pkg.version)}" />`
    ).join("\n");

    const itemGroup = refs ? `\n  <ItemGroup>\n${refs}\n  </ItemGroup>\n` : "\n";
    return `<Project Sdk="Microsoft.NET.Sdk">\n\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>net8.0</TargetFramework>\n    <ImplicitUsings>enable</ImplicitUsings>\n    <Nullable>enable</Nullable>\n  </PropertyGroup>\n${itemGroup}\n</Project>\n`;
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function downloadCsproj() {
    downloadBytes("CSharpEditor.csproj", makeCsproj(), "application/xml;charset=utf-8");
  }

  async function downloadProjectZip() {
    if (!window.JSZip) return toast("ZIP library is still loading");
    try {
      const zip = new JSZip();
      zip.file("Program.cs", ui.code.value);
      zip.file("CSharpEditor.csproj", makeCsproj());
      zip.file("README.txt",
`C# project exported from Programmer's Picnic.

Restore packages:
dotnet restore

Run:
dotnet run
`);
      for (const item of projectFiles) {
        const record = await dbGetFile(item.name);
        if (record && record.name !== "Program.cs" && !record.name.endsWith(".csproj")) {
          zip.file(record.name, record.data);
        }
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBytes("csharp-editor-project.zip", blob, "application/zip");
      toast("Project ZIP downloaded");
    } catch {
      toast("Could not build project ZIP");
    }
  }

  // ---------- SQL Server simulator ----------
  const SQL_STATE_PREFIX = "__PP_SQLSIM_STATE__";

  const SQL_DYNAMIC_EXAMPLE = `using System;
using Microsoft.Data.SqlClient;

class Program
{
    static string connectionString =
        "Server=localhost;Database=CricketDB;Trusted_Connection=True;";

    static void Main()
    {
        Console.WriteLine("1. Create Cricketer_Scores table");
        Console.WriteLine("2. Add player");
        Console.WriteLine("3. Show players");
        Console.WriteLine("4. Update runs");
        Console.WriteLine("5. Delete player");
        Console.Write("Choice: ");

        string choice = Console.ReadLine() ?? "";

        if (choice == "1") CreateTable();
        else if (choice == "2") AddPlayer();
        else if (choice == "3") ShowPlayers();
        else if (choice == "4") UpdatePlayer();
        else if (choice == "5") DeletePlayer();
        else Console.WriteLine("Invalid choice.");
    }

    static SqlConnection OpenConnection()
    {
        SqlConnection con = new SqlConnection(connectionString);
        con.Open();
        return con;
    }

    static void CreateTable()
    {
        using SqlConnection con = OpenConnection();

        string sql = @"CREATE TABLE Cricketer_Scores
        (
            playername VARCHAR(100) PRIMARY KEY,
            runs INT NOT NULL
        )";

        using SqlCommand cmd = new SqlCommand(sql, con);
        cmd.ExecuteNonQuery();

        Console.WriteLine("Cricketer_Scores table created.");
    }

    static void AddPlayer()
    {
        Console.Write("Player name: ");
        string name = Console.ReadLine() ?? "";

        Console.Write("Runs: ");
        int runs = int.Parse(Console.ReadLine() ?? "0");

        using SqlConnection con = OpenConnection();

        string sql =
            "INSERT INTO Cricketer_Scores(playername, runs) " +
            "VALUES(@playername, @runs)";

        using SqlCommand cmd = new SqlCommand(sql, con);
        cmd.Parameters.AddWithValue("@playername", name);
        cmd.Parameters.AddWithValue("@runs", runs);

        Console.WriteLine($"{cmd.ExecuteNonQuery()} row inserted.");
    }

    static void ShowPlayers()
    {
        using SqlConnection con = OpenConnection();

        using SqlCommand cmd = new SqlCommand(
            "SELECT playername, runs FROM Cricketer_Scores ORDER BY runs DESC",
            con
        );

        using SqlDataReader reader = cmd.ExecuteReader();

        while (reader.Read())
        {
            Console.WriteLine(
                $"{reader["playername"],-20} {reader["runs"],8}"
            );
        }
    }

    static void UpdatePlayer()
    {
        Console.Write("Player name: ");
        string name = Console.ReadLine() ?? "";

        Console.Write("New runs: ");
        int runs = int.Parse(Console.ReadLine() ?? "0");

        using SqlConnection con = OpenConnection();

        using SqlCommand cmd = new SqlCommand(
            "UPDATE Cricketer_Scores SET runs=@runs " +
            "WHERE playername=@playername",
            con
        );

        cmd.Parameters.AddWithValue("@runs", runs);
        cmd.Parameters.AddWithValue("@playername", name);

        Console.WriteLine($"{cmd.ExecuteNonQuery()} row updated.");
    }

    static void DeletePlayer()
    {
        Console.Write("Player name: ");
        string name = Console.ReadLine() ?? "";

        using SqlConnection con = OpenConnection();

        using SqlCommand cmd = new SqlCommand(
            "DELETE FROM Cricketer_Scores WHERE playername=@playername",
            con
        );

        cmd.Parameters.AddWithValue("@playername", name);

        Console.WriteLine($"{cmd.ExecuteNonQuery()} row deleted.");
    }
}`;

  function emptySqlState() {
    return { database: "CricketDB", tables: [] };
  }

  function normalizeSqlState(raw) {
    // Migrate the previous fixed-table storage format automatically.
    if (Array.isArray(raw)) {
      return {
        database: "CricketDB",
        tables: raw.length ? [{
          name: "Cricketer_Scores",
          columns: [
            { name: "playername", type: "VARCHAR(100)", primaryKey: true, nullable: false },
            { name: "runs", type: "INT", primaryKey: false, nullable: false }
          ],
          rows: raw.map(r => ({
            playername: String(r.playername ?? ""),
            runs: Number(r.runs) || 0
          }))
        }] : []
      };
    }

    const state = raw && typeof raw === "object" ? raw : emptySqlState();
    state.database = String(state.database || "CricketDB");
    state.tables = Array.isArray(state.tables) ? state.tables : [];

    state.tables = state.tables
      .filter(t => t && t.name)
      .map(t => ({
        name: String(t.name),
        columns: Array.isArray(t.columns) ? t.columns.map(c => ({
          name: String(c.name || ""),
          type: String(c.type || "VARCHAR(100)").toUpperCase(),
          primaryKey: Boolean(c.primaryKey),
          nullable: c.nullable !== false
        })).filter(c => c.name) : [],
        rows: Array.isArray(t.rows) ? t.rows : []
      }));

    return state;
  }

  function loadSqlState() {
    try {
      return normalizeSqlState(
        JSON.parse(localStorage.getItem(K_SQLSIM_DB) || "null")
      );
    } catch {
      return emptySqlState();
    }
  }

  function saveSqlState(state, preferredTable = "") {
    const normalized = normalizeSqlState(state);
    localStorage.setItem(K_SQLSIM_DB, JSON.stringify(normalized));
    renderSqlState(preferredTable);
  }

  function findSqlTable(state, name) {
    const wanted = String(name || "").toLowerCase();
    return state.tables.find(
      t => t.name.toLowerCase() === wanted
    ) || null;
  }

  function renderSqlState(preferredTable = "") {
    if (!ui.sqlTableSelect) return;

    const state = loadSqlState();
    ui.sqlDbName.value = state.database;

    const oldSelection =
      preferredTable ||
      ui.sqlTableSelect.value ||
      "";

    ui.sqlTableSelect.innerHTML = state.tables.length
      ? state.tables
          .map(t =>
            `<option value="${escapeAttr(t.name)}">${escapeHtml(t.name)}</option>`
          )
          .join("")
      : '<option value="">No tables</option>';

    const selected =
      findSqlTable(state, oldSelection) ||
      state.tables[0] ||
      null;

    if (selected) ui.sqlTableSelect.value = selected.name;

    renderSqlTable(selected);
  }

  function renderSqlTable(table) {
    if (!table) {
      ui.sqlSchema.innerHTML =
        '<span class="hint">Create or select a table to see its schema.</span>';
      ui.sqlDataHead.innerHTML = "";
      ui.sqlRows.innerHTML = "";
      ui.sqlEmpty.hidden = false;
      ui.sqlEmpty.textContent = "No table selected.";
      return;
    }

    ui.sqlSchema.innerHTML = table.columns.map(c => `
      <span class="sqlSchemaChip ${c.primaryKey ? "sqlPk" : ""}">
        ${escapeHtml(c.name)}
        <small>${escapeHtml(c.type)}</small>
        ${c.primaryKey ? "<b>PK</b>" : ""}
        ${!c.nullable ? "<b>NOT NULL</b>" : ""}
      </span>
    `).join("");

    ui.sqlDataHead.innerHTML =
      "<tr>" +
      table.columns
        .map(c => `<th>${escapeHtml(c.name)}</th>`)
        .join("") +
      "</tr>";

    ui.sqlRows.innerHTML = table.rows.map(row =>
      "<tr>" +
      table.columns
        .map(c => `<td>${escapeHtml(row[c.name] ?? "")}</td>`)
        .join("") +
      "</tr>"
    ).join("");

    ui.sqlEmpty.hidden = table.rows.length > 0;
    ui.sqlEmpty.textContent = table.rows.length
      ? ""
      : `Table ${table.name} has no rows yet.`;
  }

  function parseColumnDefinitions(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(x => x.trim().replace(/,$/, ""))
      .filter(Boolean);

    if (!lines.length)
      throw new Error("Add at least one column.");

    const columns = lines.map(line => {
      const m = line.match(
        /^\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s+([A-Za-z]+(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)(.*)$/i
      );
      if (!m)
        throw new Error(`Cannot understand column: ${line}`);

      const tail = m[3] || "";
      return {
        name: m[1],
        type: m[2].replace(/\s+/g, "").toUpperCase(),
        primaryKey: /\bPRIMARY\s+KEY\b/i.test(tail),
        nullable: !/\bNOT\s+NULL\b/i.test(tail) &&
                  !/\bPRIMARY\s+KEY\b/i.test(tail)
      };
    });

    const names = new Set();
    for (const col of columns) {
      const key = col.name.toLowerCase();
      if (names.has(key))
        throw new Error(`Duplicate column: ${col.name}`);
      names.add(key);
    }

    return columns;
  }

  function buildCreateTableSql() {
    const tableName = String(ui.sqlNewTableName.value || "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName))
      throw new Error("Enter a valid table name.");

    const columns = parseColumnDefinitions(ui.sqlColumnDefs.value);

    const body = columns.map(c => {
      let line = `    ${c.name} ${c.type}`;
      if (c.primaryKey) line += " PRIMARY KEY";
      else if (!c.nullable) line += " NOT NULL";
      return line;
    }).join(",\n");

    return `CREATE TABLE ${tableName}\n(\n${body}\n);`;
  }

  function createTableFromUi() {
    try {
      const tableName = String(ui.sqlNewTableName.value || "").trim();
      const columns = parseColumnDefinitions(ui.sqlColumnDefs.value);
      const state = loadSqlState();

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName))
        throw new Error("Enter a valid table name.");

      if (findSqlTable(state, tableName))
        throw new Error(`Table ${tableName} already exists.`);

      state.database = String(ui.sqlDbName.value || "CricketDB").trim() || "CricketDB";
      state.tables.push({ name: tableName, columns, rows: [] });

      saveSqlState(state, tableName);
      ui.sqlCreateBox.hidden = true;
      toast(`${tableName} created`);
    } catch (err) {
      toast(err.message || "Could not create table");
    }
  }

  async function copyCreateTableSql() {
    try {
      const sql = buildCreateTableSql();
      await navigator.clipboard.writeText(sql);
      toast("CREATE TABLE SQL copied");
    } catch (err) {
      toast(err.message || "Could not build SQL");
    }
  }

  function dropSelectedTable() {
    const selected = ui.sqlTableSelect.value;
    if (!selected) return toast("No table selected");

    if (!confirm(`Drop table ${selected}?`)) return;

    const state = loadSqlState();
    state.tables = state.tables.filter(
      t => t.name.toLowerCase() !== selected.toLowerCase()
    );

    saveSqlState(state);
    toast(`${selected} dropped`);
  }

  function createCricketSample() {
    const state = loadSqlState();
    state.database = String(ui.sqlDbName.value || "CricketDB").trim() || "CricketDB";

    const existing = findSqlTable(state, "Cricketer_Scores");
    if (existing) {
      existing.columns = [
        { name: "playername", type: "VARCHAR(100)", primaryKey: true, nullable: false },
        { name: "runs", type: "INT", primaryKey: false, nullable: false }
      ];
      existing.rows = [
        { playername: "Virat Kohli", runs: 12500 },
        { playername: "Rohit Sharma", runs: 11000 },
        { playername: "MS Dhoni", runs: 10500 }
      ];
    } else {
      state.tables.push({
        name: "Cricketer_Scores",
        columns: [
          { name: "playername", type: "VARCHAR(100)", primaryKey: true, nullable: false },
          { name: "runs", type: "INT", primaryKey: false, nullable: false }
        ],
        rows: [
          { playername: "Virat Kohli", runs: 12500 },
          { playername: "Rohit Sharma", runs: 11000 },
          { playername: "MS Dhoni", runs: 10500 }
        ]
      });
    }

    saveSqlState(state, "Cricketer_Scores");
    toast("Cricketer_Scores sample created");
  }

  function csharpStringLiteral(value) {
    return '"' + String(value ?? "")
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replaceAll("\r", "\\r")
      .replaceAll("\n", "\\n") + '"';
  }

  function csharpSeedValue(value, type) {
    if (value === null || value === undefined) return "null";

    const t = String(type || "").toUpperCase();
    if (/^(INT|SMALLINT|TINYINT)$/.test(t))
      return `Convert.ToInt32(${csharpStringLiteral(value)})`;
    if (/^BIGINT$/.test(t))
      return `Convert.ToInt64(${csharpStringLiteral(value)})`;
    if (/^(DECIMAL|NUMERIC|MONEY)/.test(t))
      return `Convert.ToDecimal(${csharpStringLiteral(value)}, CultureInfo.InvariantCulture)`;
    if (/^(FLOAT|REAL)/.test(t))
      return `Convert.ToDouble(${csharpStringLiteral(value)}, CultureInfo.InvariantCulture)`;
    if (/^BIT$/.test(t))
      return String(value).toLowerCase() === "true" || String(value) === "1"
        ? "true"
        : "false";

    return csharpStringLiteral(value);
  }

  function makeSqlShim() {
    const state = loadSqlState();

    const tableSeeds = state.tables.map(table => {
      const columns = table.columns.map(c =>
        `new SimColumn(${csharpStringLiteral(c.name)}, ${csharpStringLiteral(c.type)}, ${c.primaryKey ? "true" : "false"}, ${c.nullable ? "true" : "false"})`
      ).join(", ");

      const rows = table.rows.map(row => {
        const pairs = table.columns.map(c =>
          `{ ${csharpStringLiteral(c.name)}, ${csharpSeedValue(row[c.name], c.type)} }`
        ).join(", ");

        return `new Dictionary<string,object>(StringComparer.OrdinalIgnoreCase) { ${pairs} }`;
      }).join(", ");

      return `new SimTable(
        ${csharpStringLiteral(table.name)},
        new List<SimColumn> { ${columns} },
        new List<Dictionary<string,object>> { ${rows} }
      )`;
    }).join(", ");

    return `
namespace Microsoft.Data.SqlClient
{
    using System;
    using System.Collections.Generic;
    using System.Globalization;
    using System.Linq;
    using System.Text;
    using System.Text.RegularExpressions;

    public sealed class SqlConnection : IDisposable
    {
        public string ConnectionString { get; private set; }
        public bool IsOpen { get; private set; }

        public SqlConnection(string connectionString)
        {
            ConnectionString = connectionString ?? "";
        }

        public void Open()
        {
            IsOpen = true;
            SimDb.ApplyConnectionString(ConnectionString);
        }

        public void Close() { IsOpen = false; }
        public void Dispose() { Close(); }
    }

    public sealed class SqlParameterCollection
    {
        private readonly Dictionary<string,object> values =
            new Dictionary<string,object>(StringComparer.OrdinalIgnoreCase);

        public object AddWithValue(string name, object value)
        {
            values[Normalize(name)] = value;
            return value;
        }

        internal object Get(string name)
        {
            object value;
            return values.TryGetValue(Normalize(name), out value)
                ? value
                : null;
        }

        private static string Normalize(string name)
        {
            name = (name ?? "").Trim();
            return name.StartsWith("@") ? name : "@" + name;
        }
    }

    public sealed class SqlCommand : IDisposable
    {
        public string CommandText { get; set; }
        public SqlConnection Connection { get; set; }
        public SqlParameterCollection Parameters { get; private set; }

        public SqlCommand(string commandText, SqlConnection connection)
        {
            CommandText = commandText ?? "";
            Connection = connection;
            Parameters = new SqlParameterCollection();
        }

        private void EnsureOpen()
        {
            if (Connection == null || !Connection.IsOpen)
                throw new InvalidOperationException("SqlConnection must be opened first.");
        }

        public int ExecuteNonQuery()
        {
            EnsureOpen();
            return SimDb.ExecuteNonQuery(CommandText, Parameters);
        }

        public SqlDataReader ExecuteReader()
        {
            EnsureOpen();
            SimResult result = SimDb.ExecuteReader(CommandText, Parameters);
            return new SqlDataReader(result);
        }

        public object ExecuteScalar()
        {
            EnsureOpen();
            return SimDb.ExecuteScalar(CommandText, Parameters);
        }

        public void Dispose() { }
    }

    public sealed class SqlDataReader : IDisposable
    {
        private readonly SimResult result;
        private int index = -1;

        internal SqlDataReader(SimResult result)
        {
            this.result = result;
        }

        public bool Read()
        {
            if (index + 1 >= result.Rows.Count) return false;
            index++;
            return true;
        }

        private Dictionary<string,object> Current
        {
            get
            {
                if (index < 0 || index >= result.Rows.Count)
                    throw new InvalidOperationException("Call Read() before reading columns.");
                return result.Rows[index];
            }
        }

        public object this[string name]
        {
            get
            {
                object value;
                if (!Current.TryGetValue(name, out value))
                    throw new IndexOutOfRangeException("Unknown column: " + name);
                return value;
            }
        }

        public object this[int ordinal]
        {
            get
            {
                if (ordinal < 0 || ordinal >= result.Columns.Count)
                    throw new IndexOutOfRangeException("Unknown column ordinal: " + ordinal);
                return this[result.Columns[ordinal]];
            }
        }

        public string GetString(int ordinal)
        {
            return Convert.ToString(this[ordinal], CultureInfo.InvariantCulture) ?? "";
        }

        public int GetInt32(int ordinal)
        {
            return Convert.ToInt32(this[ordinal], CultureInfo.InvariantCulture);
        }

        public long GetInt64(int ordinal)
        {
            return Convert.ToInt64(this[ordinal], CultureInfo.InvariantCulture);
        }

        public object GetValue(int ordinal) { return this[ordinal]; }
        public void Dispose() { }
    }

    internal sealed class SimColumn
    {
        public string Name;
        public string Type;
        public bool PrimaryKey;
        public bool Nullable;

        public SimColumn(string name, string type, bool primaryKey, bool nullable)
        {
            Name = name;
            Type = type;
            PrimaryKey = primaryKey;
            Nullable = nullable;
        }
    }

    internal sealed class SimTable
    {
        public string Name;
        public List<SimColumn> Columns;
        public List<Dictionary<string,object>> Rows;

        public SimTable(
            string name,
            List<SimColumn> columns,
            List<Dictionary<string,object>> rows)
        {
            Name = name;
            Columns = columns;
            Rows = rows;
        }
    }

    internal sealed class SimResult
    {
        public List<string> Columns;
        public List<Dictionary<string,object>> Rows;

        public SimResult(
            List<string> columns,
            List<Dictionary<string,object>> rows)
        {
            Columns = columns;
            Rows = rows;
        }
    }

    internal static class SimDb
    {
        public static string DatabaseName =
            ${csharpStringLiteral(state.database || "CricketDB")};

        private static readonly List<SimTable> Tables =
            new List<SimTable> { ${tableSeeds} };

        private static string NormalizeSql(string sql)
        {
            return Regex.Replace(
                (sql ?? "").Trim().TrimEnd(';'),
                @"\s+",
                " "
            );
        }

        private static string CleanIdentifier(string value)
        {
            value = (value ?? "").Trim();
            if (value.StartsWith("[") && value.EndsWith("]"))
                value = value.Substring(1, value.Length - 2);
            return value;
        }

        private static SimTable Table(string name)
        {
            string wanted = CleanIdentifier(name);
            SimTable table = Tables.FirstOrDefault(
                t => string.Equals(
                    t.Name,
                    wanted,
                    StringComparison.OrdinalIgnoreCase
                )
            );

            if (table == null)
                throw new InvalidOperationException(
                    "Invalid object name '" + wanted + "'."
                );

            return table;
        }

        private static SimColumn Column(SimTable table, string name)
        {
            string wanted = CleanIdentifier(name);
            SimColumn col = table.Columns.FirstOrDefault(
                c => string.Equals(
                    c.Name,
                    wanted,
                    StringComparison.OrdinalIgnoreCase
                )
            );

            if (col == null)
                throw new InvalidOperationException(
                    "Invalid column name '" + wanted + "'."
                );

            return col;
        }

        public static void ApplyConnectionString(string connectionString)
        {
            Match m = Regex.Match(
                connectionString ?? "",
                @"(?:Database|Initial\s+Catalog)\s*=\s*([^;]+)",
                RegexOptions.IgnoreCase
            );

            if (m.Success)
                DatabaseName = m.Groups[1].Value.Trim();
        }

        private static List<string> SplitCommaAware(string text)
        {
            List<string> parts = new List<string>();
            StringBuilder current = new StringBuilder();
            int depth = 0;
            bool inQuote = false;

            foreach (char ch in text ?? "")
            {
                if (ch == '\\'')
                    inQuote = !inQuote;

                if (!inQuote)
                {
                    if (ch == '(') depth++;
                    else if (ch == ')') depth--;
                }

                if (ch == ',' && depth == 0 && !inQuote)
                {
                    parts.Add(current.ToString().Trim());
                    current.Clear();
                }
                else
                {
                    current.Append(ch);
                }
            }

            if (current.Length > 0)
                parts.Add(current.ToString().Trim());

            return parts.Where(x => x.Length > 0).ToList();
        }

        private static object ResolveValue(
            string token,
            SqlParameterCollection parameters,
            SimColumn column)
        {
            token = (token ?? "").Trim();

            object raw;

            if (token.StartsWith("@"))
                raw = parameters.Get(token);
            else if (
                token.StartsWith("'") &&
                token.EndsWith("'") &&
                token.Length >= 2)
                raw = token.Substring(1, token.Length - 2).Replace("''", "'");
            else if (string.Equals(token, "NULL", StringComparison.OrdinalIgnoreCase))
                raw = null;
            else
                raw = token;

            return ConvertForColumn(raw, column);
        }

        private static object ConvertForColumn(object value, SimColumn column)
        {
            if (value == null)
            {
                if (!column.Nullable)
                    throw new InvalidOperationException(
                        "Column '" + column.Name + "' does not allow NULL."
                    );
                return null;
            }

            string type = (column.Type ?? "").ToUpperInvariant();

            if (
                type.StartsWith("INT") ||
                type.StartsWith("SMALLINT") ||
                type.StartsWith("TINYINT"))
                return Convert.ToInt32(value, CultureInfo.InvariantCulture);

            if (type.StartsWith("BIGINT"))
                return Convert.ToInt64(value, CultureInfo.InvariantCulture);

            if (
                type.StartsWith("DECIMAL") ||
                type.StartsWith("NUMERIC") ||
                type.StartsWith("MONEY"))
                return Convert.ToDecimal(value, CultureInfo.InvariantCulture);

            if (
                type.StartsWith("FLOAT") ||
                type.StartsWith("REAL"))
                return Convert.ToDouble(value, CultureInfo.InvariantCulture);

            if (type.StartsWith("BIT"))
            {
                string s = Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";
                return s == "1" ||
                       s.Equals("true", StringComparison.OrdinalIgnoreCase);
            }

            return Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";
        }

        private static bool ValuesEqual(object a, object b)
        {
            if (a == null || b == null) return a == b;

            decimal da;
            decimal db;

            if (
                decimal.TryParse(
                    Convert.ToString(a, CultureInfo.InvariantCulture),
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out da
                ) &&
                decimal.TryParse(
                    Convert.ToString(b, CultureInfo.InvariantCulture),
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out db
                ))
                return da == db;

            return string.Equals(
                Convert.ToString(a, CultureInfo.InvariantCulture),
                Convert.ToString(b, CultureInfo.InvariantCulture),
                StringComparison.OrdinalIgnoreCase
            );
        }

        private static Func<Dictionary<string,object>,bool> BuildWhere(
            SimTable table,
            string whereText,
            SqlParameterCollection parameters)
        {
            if (string.IsNullOrWhiteSpace(whereText))
                return row => true;

            Match m = Regex.Match(
                whereText.Trim(),
                @"^\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*=\s*(.+)$",
                RegexOptions.IgnoreCase
            );

            if (!m.Success)
                throw new NotSupportedException(
                    "Simulator WHERE currently supports one equality condition."
                );

            SimColumn col = Column(table, m.Groups[1].Value);
            object wanted = ResolveValue(
                m.Groups[2].Value,
                parameters,
                col
            );

            return row => {
                object current;
                row.TryGetValue(col.Name, out current);
                return ValuesEqual(current, wanted);
            };
        }

        private static void CheckPrimaryKey(
            SimTable table,
            Dictionary<string,object> candidate,
            Dictionary<string,object> ignoreRow)
        {
            List<SimColumn> keys =
                table.Columns.Where(c => c.PrimaryKey).ToList();

            if (keys.Count == 0) return;

            bool duplicate = table.Rows.Any(row => {
                if (object.ReferenceEquals(row, ignoreRow))
                    return false;

                return keys.All(key => {
                    object a;
                    object b;
                    row.TryGetValue(key.Name, out a);
                    candidate.TryGetValue(key.Name, out b);
                    return ValuesEqual(a, b);
                });
            });

            if (duplicate)
                throw new InvalidOperationException(
                    "PRIMARY KEY violation on table '" + table.Name + "'."
                );
        }

        public static int ExecuteNonQuery(
            string sql,
            SqlParameterCollection parameters)
        {
            string q = NormalizeSql(sql);

            Match createDb = Regex.Match(
                q,
                @"^CREATE\s+DATABASE\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?$",
                RegexOptions.IgnoreCase
            );

            if (createDb.Success)
            {
                DatabaseName = createDb.Groups[1].Value;
                EmitState();
                return 0;
            }

            Match createTable = Regex.Match(
                q,
                @"^CREATE\s+TABLE\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*\((.*)\)$",
                RegexOptions.IgnoreCase
            );

            if (createTable.Success)
            {
                string tableName = createTable.Groups[1].Value;

                if (Tables.Any(t =>
                    string.Equals(
                        t.Name,
                        tableName,
                        StringComparison.OrdinalIgnoreCase)))
                    throw new InvalidOperationException(
                        "There is already an object named '" +
                        tableName +
                        "' in the database."
                    );

                List<SimColumn> columns = new List<SimColumn>();

                foreach (string definition in
                    SplitCommaAware(createTable.Groups[2].Value))
                {
                    Match c = Regex.Match(
                        definition,
                        @"^\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s+([A-Za-z]+(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)(.*)$",
                        RegexOptions.IgnoreCase
                    );

                    if (!c.Success)
                        throw new InvalidOperationException(
                            "Cannot parse column definition: " + definition
                        );

                    string tail = c.Groups[3].Value;
                    bool pk = Regex.IsMatch(
                        tail,
                        @"\bPRIMARY\s+KEY\b",
                        RegexOptions.IgnoreCase
                    );
                    bool nullable =
                        !pk &&
                        !Regex.IsMatch(
                            tail,
                            @"\bNOT\s+NULL\b",
                            RegexOptions.IgnoreCase
                        );

                    columns.Add(
                        new SimColumn(
                            c.Groups[1].Value,
                            Regex.Replace(c.Groups[2].Value, @"\s+", "").ToUpperInvariant(),
                            pk,
                            nullable
                        )
                    );
                }

                if (columns.Count == 0)
                    throw new InvalidOperationException(
                        "CREATE TABLE needs at least one column."
                    );

                Tables.Add(
                    new SimTable(
                        tableName,
                        columns,
                        new List<Dictionary<string,object>>()
                    )
                );

                EmitState();
                return 0;
            }

            Match drop = Regex.Match(
                q,
                @"^DROP\s+TABLE\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?$",
                RegexOptions.IgnoreCase
            );

            if (drop.Success)
            {
                string tableName = drop.Groups[1].Value;
                int removed = Tables.RemoveAll(
                    t => string.Equals(
                        t.Name,
                        tableName,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

                if (removed == 0)
                    throw new InvalidOperationException(
                        "Cannot drop the table '" + tableName +
                        "', because it does not exist."
                    );

                EmitState();
                return 0;
            }

            Match insert = Regex.Match(
                q,
                @"^INSERT\s+INTO\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*\((.*?)\)\s*VALUES\s*\((.*?)\)$",
                RegexOptions.IgnoreCase
            );

            if (insert.Success)
            {
                SimTable table = Table(insert.Groups[1].Value);

                List<string> names =
                    SplitCommaAware(insert.Groups[2].Value)
                    .Select(CleanIdentifier)
                    .ToList();

                List<string> values =
                    SplitCommaAware(insert.Groups[3].Value);

                if (names.Count != values.Count)
                    throw new InvalidOperationException(
                        "Column count does not match value count."
                    );

                Dictionary<string,object> row =
                    new Dictionary<string,object>(
                        StringComparer.OrdinalIgnoreCase
                    );

                foreach (SimColumn col in table.Columns)
                    row[col.Name] = null;

                for (int i = 0; i < names.Count; i++)
                {
                    SimColumn col = Column(table, names[i]);
                    row[col.Name] =
                        ResolveValue(values[i], parameters, col);
                }

                foreach (SimColumn col in table.Columns)
                {
                    object value;
                    row.TryGetValue(col.Name, out value);

                    if (value == null && !col.Nullable)
                        throw new InvalidOperationException(
                            "Column '" + col.Name + "' does not allow NULL."
                        );
                }

                CheckPrimaryKey(table, row, null);
                table.Rows.Add(row);
                EmitState();
                return 1;
            }

            Match update = Regex.Match(
                q,
                @"^UPDATE\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?$",
                RegexOptions.IgnoreCase
            );

            if (update.Success)
            {
                SimTable table = Table(update.Groups[1].Value);
                List<string> assignments =
                    SplitCommaAware(update.Groups[2].Value);

                Func<Dictionary<string,object>,bool> predicate =
                    BuildWhere(
                        table,
                        update.Groups[3].Success
                            ? update.Groups[3].Value
                            : "",
                        parameters
                    );

                int count = 0;

                foreach (Dictionary<string,object> row in
                    table.Rows.Where(predicate).ToList())
                {
                    Dictionary<string,object> candidate =
                        new Dictionary<string,object>(
                            row,
                            StringComparer.OrdinalIgnoreCase
                        );

                    foreach (string assignment in assignments)
                    {
                        Match a = Regex.Match(
                            assignment,
                            @"^\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*=\s*(.+)$"
                        );

                        if (!a.Success)
                            throw new InvalidOperationException(
                                "Cannot parse SET expression: " +
                                assignment
                            );

                        SimColumn col = Column(
                            table,
                            a.Groups[1].Value
                        );

                        candidate[col.Name] =
                            ResolveValue(
                                a.Groups[2].Value,
                                parameters,
                                col
                            );
                    }

                    CheckPrimaryKey(table, candidate, row);

                    row.Clear();
                    foreach (var pair in candidate)
                        row[pair.Key] = pair.Value;

                    count++;
                }

                if (count > 0) EmitState();
                return count;
            }

            Match delete = Regex.Match(
                q,
                @"^DELETE\s+FROM\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?(?:\s+WHERE\s+(.*))?$",
                RegexOptions.IgnoreCase
            );

            if (delete.Success)
            {
                SimTable table = Table(delete.Groups[1].Value);

                Func<Dictionary<string,object>,bool> predicate =
                    BuildWhere(
                        table,
                        delete.Groups[2].Success
                            ? delete.Groups[2].Value
                            : "",
                        parameters
                    );

                int count = table.Rows.RemoveAll(
                    row => predicate(row)
                );

                if (count > 0) EmitState();
                return count;
            }

            throw new NotSupportedException(
                "SQL Server Simulator supports CREATE DATABASE, CREATE TABLE, DROP TABLE, INSERT, UPDATE and DELETE in ExecuteNonQuery()."
            );
        }

        public static SimResult ExecuteReader(
            string sql,
            SqlParameterCollection parameters)
        {
            string q = NormalizeSql(sql);

            Match select = Regex.Match(
                q,
                @"^SELECT\s+(.*?)\s+FROM\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?(?:\s+WHERE\s+(.*?))?(?:\s+ORDER\s+BY\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?(?:\s+(ASC|DESC))?)?$",
                RegexOptions.IgnoreCase
            );

            if (!select.Success)
                throw new NotSupportedException(
                    "Simulator supports SELECT ... FROM table with optional WHERE col=value and ORDER BY."
                );

            SimTable table = Table(select.Groups[2].Value);
            string columnText = select.Groups[1].Value.Trim();

            List<string> selectedColumns;

            if (columnText == "*")
                selectedColumns =
                    table.Columns.Select(c => c.Name).ToList();
            else
                selectedColumns =
                    SplitCommaAware(columnText)
                    .Select(CleanIdentifier)
                    .ToList();

            foreach (string name in selectedColumns)
                Column(table, name);

            Func<Dictionary<string,object>,bool> predicate =
                BuildWhere(
                    table,
                    select.Groups[3].Success
                        ? select.Groups[3].Value
                        : "",
                    parameters
                );

            IEnumerable<Dictionary<string,object>> query =
                table.Rows.Where(predicate);

            if (select.Groups[4].Success)
            {
                SimColumn orderColumn =
                    Column(table, select.Groups[4].Value);

                Func<Dictionary<string,object>,object> key =
                    row => {
                        object value;
                        row.TryGetValue(orderColumn.Name, out value);
                        return value;
                    };

                bool desc =
                    select.Groups[5].Success &&
                    select.Groups[5].Value.Equals(
                        "DESC",
                        StringComparison.OrdinalIgnoreCase
                    );

                query = desc
                    ? query.OrderByDescending(
                        key,
                        Comparer<object>.Create(CompareObjects)
                      )
                    : query.OrderBy(
                        key,
                        Comparer<object>.Create(CompareObjects)
                      );
            }

            List<Dictionary<string,object>> rows =
                query.Select(row => {
                    Dictionary<string,object> projected =
                        new Dictionary<string,object>(
                            StringComparer.OrdinalIgnoreCase
                        );

                    foreach (string col in selectedColumns)
                    {
                        object value;
                        row.TryGetValue(col, out value);
                        projected[col] = value;
                    }

                    return projected;
                }).ToList();

            return new SimResult(
                selectedColumns,
                rows
            );
        }

        private static int CompareObjects(object a, object b)
        {
            if (a == null && b == null) return 0;
            if (a == null) return -1;
            if (b == null) return 1;

            decimal da;
            decimal db;

            if (
                decimal.TryParse(
                    Convert.ToString(a, CultureInfo.InvariantCulture),
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out da
                ) &&
                decimal.TryParse(
                    Convert.ToString(b, CultureInfo.InvariantCulture),
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out db
                ))
                return da.CompareTo(db);

            return string.Compare(
                Convert.ToString(a, CultureInfo.InvariantCulture),
                Convert.ToString(b, CultureInfo.InvariantCulture),
                StringComparison.OrdinalIgnoreCase
            );
        }

        public static object ExecuteScalar(
            string sql,
            SqlParameterCollection parameters)
        {
            string q = NormalizeSql(sql);

            Match aggregate = Regex.Match(
                q,
                @"^SELECT\s+(COUNT\s*\(\s*\*\s*\)|SUM\s*\(\s*\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*\)|MIN\s*\(\s*\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*\)|MAX\s*\(\s*\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*\))\s+FROM\s+\[?([A-Za-z_][A-Za-z0-9_]*)\]?(?:\s+WHERE\s+(.*))?$",
                RegexOptions.IgnoreCase
            );

            if (!aggregate.Success)
                throw new NotSupportedException(
                    "ExecuteScalar supports COUNT(*), SUM(column), MIN(column) and MAX(column)."
                );

            SimTable table = Table(aggregate.Groups[5].Value);

            Func<Dictionary<string,object>,bool> predicate =
                BuildWhere(
                    table,
                    aggregate.Groups[6].Success
                        ? aggregate.Groups[6].Value
                        : "",
                    parameters
                );

            List<Dictionary<string,object>> rows =
                table.Rows.Where(predicate).ToList();

            string expression =
                aggregate.Groups[1].Value.ToUpperInvariant();

            if (expression.StartsWith("COUNT"))
                return rows.Count;

            string columnName =
                aggregate.Groups[2].Success
                    ? aggregate.Groups[2].Value
                    : aggregate.Groups[3].Success
                        ? aggregate.Groups[3].Value
                        : aggregate.Groups[4].Value;

            SimColumn col = Column(table, columnName);

            List<decimal> numbers =
                rows.Select(row => {
                    object value;
                    row.TryGetValue(col.Name, out value);

                    decimal number;
                    if (!decimal.TryParse(
                        Convert.ToString(
                            value,
                            CultureInfo.InvariantCulture
                        ),
                        NumberStyles.Any,
                        CultureInfo.InvariantCulture,
                        out number))
                        throw new InvalidOperationException(
                            "Aggregate requires a numeric column."
                        );

                    return number;
                }).ToList();

            if (numbers.Count == 0) return 0m;

            if (expression.StartsWith("SUM"))
                return numbers.Sum();
            if (expression.StartsWith("MIN"))
                return numbers.Min();

            return numbers.Max();
        }

        private static string B64(string value)
        {
            return Convert.ToBase64String(
                Encoding.UTF8.GetBytes(value ?? "")
            );
        }

        private static void EmitState()
        {
            StringBuilder payload = new StringBuilder();

            payload.Append("D|")
                   .Append(B64(DatabaseName))
                   .Append("\\n");

            foreach (SimTable table in Tables)
            {
                payload.Append("T|")
                       .Append(B64(table.Name))
                       .Append("\\n");

                foreach (SimColumn col in table.Columns)
                {
                    payload.Append("C|")
                           .Append(B64(table.Name)).Append("|")
                           .Append(B64(col.Name)).Append("|")
                           .Append(B64(col.Type)).Append("|")
                           .Append(col.PrimaryKey ? "1" : "0").Append("|")
                           .Append(col.Nullable ? "1" : "0")
                           .Append("\\n");
                }

                foreach (Dictionary<string,object> row in table.Rows)
                {
                    payload.Append("R|")
                           .Append(B64(table.Name));

                    foreach (SimColumn col in table.Columns)
                    {
                        object value;
                        row.TryGetValue(col.Name, out value);

                        payload.Append("|")
                               .Append(B64(
                                   value == null
                                       ? ""
                                       : Convert.ToString(
                                           value,
                                           CultureInfo.InvariantCulture
                                         ) ?? ""
                               ));
                    }

                    payload.Append("\\n");
                }
            }

            string encoded =
                Convert.ToBase64String(
                    Encoding.UTF8.GetBytes(payload.ToString())
                );

            Console.WriteLine(
                "${SQL_STATE_PREFIX}" + encoded
            );
        }
    }
}
`;
  }

  function useSqlSim(code) {
    return Boolean(
      ui.sqlSimEnabled &&
      ui.sqlSimEnabled.checked &&
      /\b(Microsoft\.Data\.SqlClient|SqlConnection|SqlCommand|SqlDataReader)\b/.test(
        String(code || "")
      )
    );
  }

  function executionCode() {
    return useSqlSim(ui.code.value)
      ? ui.code.value + makeSqlShim()
      : ui.code.value;
  }

  function decodeSqlState(stdout) {
    const visible = [];
    let encoded = null;

    String(stdout || "")
      .split(/\r?\n/)
      .forEach(line => {
        if (line.startsWith(SQL_STATE_PREFIX))
          encoded = line.slice(SQL_STATE_PREFIX.length).trim();
        else
          visible.push(line);
      });

    if (encoded !== null) {
      try {
        const payloadBytes =
          Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const payload =
          new TextDecoder().decode(payloadBytes);

        const state = emptySqlState();
        const tableMap = new Map();

        const decode = value => {
          const raw =
            Uint8Array.from(atob(value || ""), c => c.charCodeAt(0));
          return new TextDecoder().decode(raw);
        };

        for (const line of payload.split("\n")) {
          if (!line) continue;
          const parts = line.split("|");

          if (parts[0] === "D") {
            state.database = decode(parts[1]);
          } else if (parts[0] === "T") {
            const name = decode(parts[1]);
            const table = { name, columns: [], rows: [] };
            state.tables.push(table);
            tableMap.set(name.toLowerCase(), table);
          } else if (parts[0] === "C") {
            const tableName = decode(parts[1]);
            const table =
              tableMap.get(tableName.toLowerCase());
            if (!table) continue;

            table.columns.push({
              name: decode(parts[2]),
              type: decode(parts[3]),
              primaryKey: parts[4] === "1",
              nullable: parts[5] === "1"
            });
          } else if (parts[0] === "R") {
            const tableName = decode(parts[1]);
            const table =
              tableMap.get(tableName.toLowerCase());
            if (!table) continue;

            const row = {};

            table.columns.forEach((col, i) => {
              const raw = decode(parts[i + 2] || "");

              if (/^(INT|SMALLINT|TINYINT|BIGINT|DECIMAL|NUMERIC|MONEY|FLOAT|REAL)/i.test(col.type))
                row[col.name] = raw === "" ? "" : Number(raw);
              else if (/^BIT/i.test(col.type))
                row[col.name] = raw === "True" || raw === "true" || raw === "1";
              else
                row[col.name] = raw;
            });

            table.rows.push(row);
          }
        }

        saveSqlState(
          state,
          ui.sqlTableSelect.value
        );
      } catch {
        // Keep the prior simulator state if a compiler/backend altered the marker.
      }
    }

    return visible
      .join("\n")
      .replace(/\n+$/, "");
  }

  function loadSqlExample() {
    ui.code.value = SQL_DYNAMIC_EXAMPLE;
    ui.stdin.value = "1";
    ui.shareTitle.value =
      "C# Dynamic SQL Server Simulator";
    ui.sqlSimEnabled.checked = true;
    ui.sqlSimPanel.hidden = false;

    localStorage.setItem(
      K_SQLSIM_ENABLED,
      "true"
    );

    updateGutter();
    save();
    ui.code.scrollTop = 0;
    syncHighlightScroll();
    toast("Dynamic SQL example loaded");
  }

  // ---------- C# syntax highlighting ----------
  const csharpKeywords = new Set([
    "abstract","as","base","break","case","catch","checked","class","const","continue","default","delegate","do","else","enum","event","explicit","extern","false","finally","fixed","for","foreach","goto","if","implicit","in","interface","internal","is","lock","namespace","new","null","operator","out","override","params","private","protected","public","readonly","ref","return","sealed","sizeof","stackalloc","static","struct","switch","this","throw","true","try","typeof","unchecked","unsafe","using","virtual","void","volatile","while","add","alias","and","ascending","async","await","by","descending","dynamic","equals","from","get","global","group","init","into","join","let","managed","nameof","nint","not","notnull","nuint","on","or","orderby","partial","record","remove","required","scoped","select","set","unmanaged","value","var","when","where","with","yield"
  ]);
  const csharpTypes = new Set([
    "bool","byte","sbyte","char","decimal","double","float","int","uint","long","ulong","short","ushort","object","string","String","Console","Math","DateTime","TimeSpan","Guid","List","Dictionary","HashSet","Queue","Stack","IEnumerable","Task","Exception"
  ]);
  const linqWords = new Set(["Select","Where","OrderBy","OrderByDescending","ThenBy","GroupBy","Join","Any","All","Count","Sum","Average","Min","Max","First","FirstOrDefault","Single","SingleOrDefault","ToList","ToArray"]);

  function isIdentStart(ch) { return /[A-Za-z_]/.test(ch); }
  function isIdentPart(ch) { return /[A-Za-z0-9_]/.test(ch); }

  function highlightCSharp(code) {
    const lines = String(code ?? "").split("\n");
    let inBlockComment = false;

    return lines.map(line => {
      let i = 0;
      let out = "";

      if (!inBlockComment && /^\s*#/.test(line)) {
        return `<div class="codeLine"><span class="tok-pre">${escapeHtml(line)}</span></div>`;
      }

      while (i < line.length) {
        if (inBlockComment) {
          const end = line.indexOf("*/", i);
          if (end === -1) {
            out += `<span class="tok-comment">${escapeHtml(line.slice(i))}</span>`;
            i = line.length;
            break;
          }
          out += `<span class="tok-comment">${escapeHtml(line.slice(i, end + 2))}</span>`;
          i = end + 2;
          inBlockComment = false;
          continue;
        }

        if (line.startsWith("//", i)) {
          out += `<span class="tok-comment">${escapeHtml(line.slice(i))}</span>`;
          i = line.length;
          break;
        }

        if (line.startsWith("/*", i)) {
          const end = line.indexOf("*/", i + 2);
          if (end === -1) {
            out += `<span class="tok-comment">${escapeHtml(line.slice(i))}</span>`;
            inBlockComment = true;
            i = line.length;
            break;
          }
          out += `<span class="tok-comment">${escapeHtml(line.slice(i, end + 2))}</span>`;
          i = end + 2;
          continue;
        }

        // Attributes: [Serializable], [Obsolete(...)] etc.
        if (line[i] === "[" && /[A-Za-z_]/.test(line[i + 1] || "")) {
          const close = line.indexOf("]", i + 1);
          if (close !== -1) {
            out += `<span class="tok-attr">${escapeHtml(line.slice(i, close + 1))}</span>`;
            i = close + 1;
            continue;
          }
        }

        // Verbatim/interpolated/normal strings and chars.
        let prefixLen = 0;
        if (line.startsWith("$@\"", i) || line.startsWith("@$\"", i)) prefixLen = 2;
        else if (line.startsWith("@\"", i) || line.startsWith("$\"", i)) prefixLen = 1;

        if (prefixLen || line[i] === '"' || line[i] === "'") {
          const quoteIndex = i + prefixLen;
          const quote = line[quoteIndex];
          const verbatim = line.slice(i, quoteIndex).includes("@");
          let j = quoteIndex + 1;
          while (j < line.length) {
            if (quote === '"' && verbatim && line[j] === '"' && line[j + 1] === '"') { j += 2; continue; }
            if (!verbatim && line[j] === "\\") { j += 2; continue; }
            if (line[j] === quote) { j++; break; }
            j++;
          }
          out += `<span class="tok-string">${escapeHtml(line.slice(i, j))}</span>`;
          i = j;
          continue;
        }

        if (/\d/.test(line[i]) || (line[i] === "." && /\d/.test(line[i + 1] || ""))) {
          let j = i + 1;
          while (j < line.length && /[0-9A-Fa-f_xXbBeE.+\-mMdDfFuUlL]/.test(line[j])) j++;
          out += `<span class="tok-number">${escapeHtml(line.slice(i, j))}</span>`;
          i = j;
          continue;
        }

        if (isIdentStart(line[i])) {
          let j = i + 1;
          while (j < line.length && isIdentPart(line[j])) j++;
          const raw = line.slice(i, j);
          let cls = "";
          if (csharpKeywords.has(raw)) cls = "tok-keyword";
          else if (csharpTypes.has(raw) || /^[A-Z][A-Za-z0-9_]*$/.test(raw)) cls = "tok-type";
          if (linqWords.has(raw)) cls = "tok-linq";
          out += cls ? `<span class="${cls}">${escapeHtml(raw)}</span>` : escapeHtml(raw);
          i = j;
          continue;
        }

        if (/[+\-*\/%=<>!&|^~?:.,;(){}\[\]]/.test(line[i])) {
          out += `<span class="tok-operator">${escapeHtml(line[i])}</span>`;
          i++;
          continue;
        }

        out += escapeHtml(line[i]);
        i++;
      }

      return `<div class="codeLine">${out || "&nbsp;"}</div>`;
    }).join("");
  }

  function syncHighlightScroll() {
    if (!ui.highlight || !ui.code) return;
    const x = ui.code.scrollLeft || 0;
    const y = ui.code.scrollTop || 0;
    const inner = ui.highlight.querySelector(".codeHighlightInner");
    if (inner) inner.style.transform = `translate(${-x}px, ${-y}px)`;
    if (ui.gutter) ui.gutter.scrollTop = y;
  }

  function updateHighlight() {
    ui.highlight.innerHTML = `<div class="codeHighlightInner">${highlightCSharp(ui.code.value)}</div>`;
    syncHighlightScroll();
  }

  function updateGutter() {
    const n = ui.code.value.split("\n").length;
    ui.gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    updateHighlight();
  }

  function scheduleEditorSync() {
    cancelAnimationFrame(highlightSyncFrame);
    highlightSyncFrame = requestAnimationFrame(() => {
      updateHighlight();
      syncHighlightScroll();
    });
  }

  function installEditorLayoutWatchers() {
    const targets = [ui.code, ui.highlight, ui.gutter, document.querySelector(".editorWrap"), ui.codeCard].filter(Boolean);
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(scheduleEditorSync);
      targets.forEach(el => ro.observe(el));
    }
    window.addEventListener("resize", scheduleEditorSync);
    window.addEventListener("orientationchange", scheduleEditorSync);
    window.addEventListener("pageshow", scheduleEditorSync);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", scheduleEditorSync);
  }

  function applyFont(size) {
    const px = Number(size) || 16;
    const lineHeight = Math.round(px * 1.5) + "px";
    document.documentElement.style.setProperty("--editor-line-height", lineHeight);
    [ui.code, ui.gutter, ui.highlight].forEach(el => {
      if (!el) return;
      el.style.fontSize = px + "px";
      el.style.lineHeight = lineHeight;
    });
    ui.out.style.fontSize = Math.max(14, px - 1) + "px";
    ui.err.style.fontSize = Math.max(14, px - 1) + "px";
    localStorage.setItem(K_FONT, String(px));
    scheduleEditorSync();
  }

  // ---------- typing aids ----------
  function getLineBounds(value, start, end) {
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const next = value.indexOf("\n", end);
    const lineEnd = next === -1 ? value.length : next;
    return [lineStart, lineEnd];
  }

  function toggleComment() {
    const el = ui.code;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const [lineStart, lineEnd] = getLineBounds(value, start, end);
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const useful = lines.filter(line => line.trim().length);
    const uncomment = useful.length && useful.every(line => /^\s*\/\/ ?/.test(line));
    const updated = lines.map(line => {
      if (!line.trim()) return line;
      return uncomment ? line.replace(/^(\s*)\/\/ ?/, "$1") : line.replace(/^(\s*)/, "$1// ");
    }).join("\n");
    el.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
    el.selectionStart = lineStart;
    el.selectionEnd = lineStart + updated.length;
    updateGutter(); save();
    toast(uncomment ? "Uncommented" : "Commented");
  }

  function indentSelection(outdent = false) {
    const el = ui.code;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end && !outdent) {
      el.setRangeText("    ", start, end, "end");
      updateGutter(); save();
      return;
    }
    const [lineStart, lineEnd] = getLineBounds(value, start, end);
    const block = value.slice(lineStart, lineEnd);
    const updated = block.split("\n").map(line => {
      if (!outdent) return "    " + line;
      if (line.startsWith("    ")) return line.slice(4);
      if (line.startsWith("\t")) return line.slice(1);
      return line.replace(/^ {1,3}/, "");
    }).join("\n");
    el.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
    el.selectionStart = lineStart;
    el.selectionEnd = lineStart + updated.length;
    updateGutter(); save();
  }

  function smartEnter(e) {
    const el = ui.code;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const beforeLine = value.slice(lineStart, start);
    const nextNl = value.indexOf("\n", start);
    const afterCursor = value.slice(start, nextNl === -1 ? value.length : nextNl);
    const baseIndent = (beforeLine.match(/^\s*/) || [""])[0];
    let nextIndent = baseIndent;
    if (beforeLine.trimEnd().endsWith("{")) nextIndent += "    ";
    e.preventDefault();
    if (/^\s*}/.test(afterCursor) && nextIndent.length >= 4) {
      el.setRangeText("\n" + nextIndent + "\n" + baseIndent, start, end, "end");
      el.selectionStart = el.selectionEnd = start + 1 + nextIndent.length;
    } else {
      el.setRangeText("\n" + nextIndent, start, end, "end");
    }
    updateGutter(); save();
  }

  function wrapPair(open, close) {
    const el = ui.code;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    el.setRangeText(open + selected + close, start, end, selected ? "select" : "end");
    if (!selected) el.selectionStart = el.selectionEnd = start + open.length;
    updateGutter(); save();
  }

  function insertClosingBraceWithOutdent(e) {
    if (e.key !== "}") return false;
    const el = ui.code;
    if (el.selectionStart !== el.selectionEnd) return false;
    const pos = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
    const before = el.value.slice(lineStart, pos);
    if (!/^\s+$/.test(before) || before.length < 4) return false;
    e.preventDefault();
    const shorter = before.slice(0, Math.max(0, before.length - 4));
    if (el.value[pos] === "}") {
      el.value = el.value.slice(0, lineStart) + shorter + el.value.slice(pos);
    } else {
      el.value = el.value.slice(0, lineStart) + shorter + "}" + el.value.slice(pos);
    }
    el.selectionStart = el.selectionEnd = lineStart + shorter.length + 1;
    updateGutter(); save();
    return true;
  }

  function handleTypingAid(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runCode(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); toggleComment(); return; }
    if (e.key === "Tab") { e.preventDefault(); indentSelection(e.shiftKey); return; }
    if (e.key === "Enter") { smartEnter(e); return; }
    if (insertClosingBraceWithOutdent(e)) return;

    const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
    if (!e.ctrlKey && !e.metaKey && !e.altKey && pairs[e.key]) {
      // Avoid pairing apostrophes in common cases like comments/text pasted into code.
      e.preventDefault(); wrapPair(e.key, pairs[e.key]); return;
    }
    if ([")", "]", "}", '"', "'"].includes(e.key)) {
      const el = ui.code;
      if (el.selectionStart === el.selectionEnd && el.value[el.selectionStart] === e.key) {
        e.preventDefault();
        el.selectionStart = el.selectionEnd = el.selectionStart + 1;
      }
    }
  }

  // ---------- compiler execution ----------
  function stopReading() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function readRunOutput(stdout, stderr) {
    if (!ui.readOutput.checked || !("speechSynthesis" in window)) return;
    const outText = String(stdout || "").trim();
    const errText = String(stderr || "").trim();
    const parts = [];
    if (outText) parts.push(`Standard output. ${outText}`);
    if (errText) parts.push(`Compiler or standard error. ${errText}`);
    if (!parts.length) parts.push("The program finished with no output.");
    stopReading();
    parts.forEach(text => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = document.documentElement.lang || "en";
      window.speechSynthesis.speak(utterance);
    });
  }

  function setBusy(busy) {
    running = busy;
    ui.run.disabled = busy;
    ui.stop.disabled = !busy;
    ui.compiler.disabled = busy;
    ui.refreshCompiler.disabled = busy;
  }

  function compilerScore(c) {
    const name = String(c.name || "").toLowerCase();
    const display = String(c.display_name || c.version || "").toLowerCase();
    let score = 0;
    if (name.includes("dotnet") || display.includes("dotnet")) score += 100;
    if (name.includes("mono") || display.includes("mono")) score += 80;
    if (name.includes("head") || display.includes("head")) score += 20;
    return score;
  }

  async function discoverCompilers(force = false) {
    if (force) compilerRows = [];
    setStatus("Finding C# compiler…");
    ui.compiler.innerHTML = '<option value="">Finding C# compiler…</option>';
    try {
      const res = await fetch("https://wandbox.org/api/list.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      compilerRows = rows.filter(c => /c#|csharp|c sharp/i.test(String(c.language || "")));
      if (!compilerRows.length) throw new Error("No C# compiler advertised by Wandbox");
      compilerRows.sort((a, b) => compilerScore(b) - compilerScore(a));
      ui.compiler.innerHTML = compilerRows.map(c => {
        const label = c.display_name || `${c.name}${c.version ? " · " + c.version : ""}`;
        return `<option value="${escapeAttr(c.name)}">${escapeHtml(label)}</option>`;
      }).join("");
      const saved = localStorage.getItem(K_COMPILER);
      if (saved && compilerRows.some(c => c.name === saved)) ui.compiler.value = saved;
      else ui.compiler.value = compilerRows[0].name;
      localStorage.setItem(K_COMPILER, ui.compiler.value);
      setStatus("Ready", "ok");
    } catch (err) {
      ui.compiler.innerHTML = '<option value="">Auto fallback</option>';
      setStatus("Ready — fallback compiler", "ok");
    }
  }

  async function runWithWandbox(code, stdin, signal) {
    let compiler = ui.compiler.value;
    if (!compiler) {
      if (!compilerRows.length) await discoverCompilers();
      compiler = ui.compiler.value;
    }
    if (!compiler) throw new Error("No Wandbox C# compiler is available.");

    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        code,
        compiler,
        stdin,
        options: "",
        "compiler-option-raw": "",
        "runtime-option-raw": ""
      })
    });
    if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);
    const data = await res.json();

    const stdout = [data.program_output, data.program_message].filter(Boolean).join("\n").trim();
    const stderr = [data.compiler_output, data.compiler_message].filter(Boolean).join("\n").trim();
    const status = String(data.status ?? "0");
    return { stdout, stderr, ok: !stderr && (status === "0" || status === "") };
  }

  async function discoverJudge0Language(signal) {
    if (judge0LanguageId) return judge0LanguageId;
    const res = await fetch("https://ce.judge0.com/languages/", { signal });
    if (!res.ok) throw new Error(`Judge0 languages HTTP ${res.status}`);
    const langs = await res.json();
    const chosen = langs.find(x => /^c#\s*\(/i.test(String(x.name || ""))) || langs.find(x => /c#|csharp|c sharp/i.test(String(x.name || "")));
    if (!chosen) throw new Error("Judge0 does not advertise a C# language.");
    judge0LanguageId = chosen.id;
    return judge0LanguageId;
  }

  async function pollJudge0(token, signal) {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`https://ce.judge0.com/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status`, { signal });
      if (!res.ok) throw new Error(`Judge0 polling HTTP ${res.status}`);
      const data = await res.json();
      const id = data.status && data.status.id;
      if (id !== 1 && id !== 2) return data;
      await new Promise(resolve => setTimeout(resolve, 450));
    }
    throw new Error("Judge0 timed out waiting for the result.");
  }

  async function runWithJudge0(code, stdin, signal) {
    const languageId = await discoverJudge0Language(signal);
    const res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ source_code: code, language_id: languageId, stdin })
    });
    if (!res.ok) throw new Error(`Judge0 HTTP ${res.status}`);
    let data = await res.json();
    if (data.token && (!data.status || data.status.id === 1 || data.status.id === 2)) data = await pollJudge0(data.token, signal);
    const stdout = String(data.stdout || "").trim();
    const stderr = [data.compile_output, data.stderr, data.message].filter(Boolean).join("\n").trim();
    return { stdout, stderr, ok: Boolean(data.status && data.status.id === 3) };
  }

  async function runCode() {
    if (running) return toast("Already running");
    save();
    stopReading();
    controller = new AbortController();
    setBusy(true);
    ui.out.textContent = "Running…";
    ui.err.textContent = "";
    setStatus("Running…");
    const started = performance.now();
    const failures = [];

    clearTimeout(runTimer);
    runTimer = setTimeout(() => {
      if (controller) controller.abort();
    }, 18000);

    try {
      let result;
      try {
        result = await runWithWandbox(executionCode(), ui.stdin.value, controller.signal);
      } catch (err) {
        if (err.name === "AbortError") throw err;
        failures.push(`Wandbox: ${err.message}`);
        result = await runWithJudge0(executionCode(), ui.stdin.value, controller.signal);
      }

      const elapsed = ((performance.now() - started) / 1000).toFixed(2);
      const cleanStdout = useSqlSim(ui.code.value) ? decodeSqlState(result.stdout) : result.stdout;
      ui.out.textContent = cleanStdout || "(no stdout)";
      ui.err.textContent = result.stderr || "(no compiler/runtime errors)";
      setStatus(result.ok ? `Ready · ${elapsed}s` : `Finished with errors · ${elapsed}s`, result.ok ? "ok" : "bad");
      readRunOutput(cleanStdout, result.stderr);
    } catch (err) {
      if (err.name === "AbortError") {
        ui.out.textContent = "Execution stopped.";
        ui.err.textContent = "The run was cancelled or exceeded the 18 second browser timeout.";
        setStatus("Stopped", "bad");
      } else {
        ui.out.textContent = "(no stdout)";
        ui.err.textContent = [
          "Unable to reach a C# execution backend.",
          err.message,
          failures.join("\n")
        ].filter(Boolean).join("\n\n");
        setStatus("Compiler unavailable", "bad");
      }
    } finally {
      clearTimeout(runTimer);
      runTimer = null;
      controller = null;
      setBusy(false);
    }
  }

  function stopRun() {
    if (controller) controller.abort();
    stopReading();
  }

  // ---------- theme, fullscreen, panels, share ----------
  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = t;
    localStorage.setItem(K_THEME, t);
    ui.theme.textContent = t === "dark" ? "Light" : "Dark";
  }

  function syncFullscreenButtons() {
    const active = ui.app.classList.contains("fullscreen") || document.fullscreenElement === ui.app;
    ui.fullscreenButtons.forEach(btn => btn.textContent = active ? "Exit full screen" : "Full screen");
  }

  async function toggleFullscreen() {
    const active = ui.app.classList.contains("fullscreen") || document.fullscreenElement === ui.app;
    if (active) {
      ui.app.classList.remove("fullscreen");
      document.body.classList.remove("fullscreen");
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch {}
      }
    } else {
      ui.app.classList.add("fullscreen");
      document.body.classList.add("fullscreen");
      try { if (ui.app.requestFullscreen) await ui.app.requestFullscreen(); } catch {}
    }
    syncFullscreenButtons();
    scheduleEditorSync();
  }

  function closeIoExpandedCards() {
    document.querySelectorAll(".ioToggleCard.ioExpanded").forEach(card => {
      card.classList.remove("ioExpanded");
      const btn = card.querySelector(".jsToggleBox");
      if (btn) btn.textContent = "Expand";
    });
    document.body.classList.remove("ioExpandedMode");
  }

  function toggleCodeFullscreen() {
    const willExpand = !ui.codeCard.classList.contains("codeExpanded");
    closeIoExpandedCards();
    ui.codeCard.classList.toggle("codeExpanded", willExpand);
    document.body.classList.toggle("ioExpandedMode", willExpand);
    ui.codeFullscreen.textContent = willExpand ? "Original size" : "Full screen";
    setTimeout(() => { ui.code.focus(); scheduleEditorSync(); }, 0);
  }

  function toggleIoBox(btn) {
    const card = btn.closest(".ioToggleCard");
    if (!card) return;
    const willExpand = !card.classList.contains("ioExpanded");
    closeIoExpandedCards();
    if (ui.codeCard.classList.contains("codeExpanded")) toggleCodeFullscreen();
    if (willExpand) {
      card.classList.add("ioExpanded");
      btn.textContent = "Original size";
      document.body.classList.add("ioExpandedMode");
    }
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  function decodeBase64Url(text) {
    let b64 = text.replaceAll("-", "+").replaceAll("_", "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function shareProject() {
    save();
    const title = ui.shareTitle.value.trim() || "C# Editor Project";
    const payload = JSON.stringify({ title, code:ui.code.value, stdin:ui.stdin.value, compiler:ui.compiler.value||"", packages:installedPackages, sqlSimEnabled:ui.sqlSimEnabled.checked, sqlState:loadSqlState() });
    const url = location.origin + location.pathname + location.search + "#" + encodeBase64Url(payload);
    const message = `${title}\nC# Editor - Programmer's Picnic\n${url}`;
    try {
      if (navigator.share) { await navigator.share({ title, text:`${title}\nC# Editor - Programmer's Picnic`, url }); toast("Shared"); }
      else { await navigator.clipboard.writeText(message); toast("Share title + link copied"); }
    } catch (err) { toast(err && err.name === "AbortError" ? "Share cancelled" : "Could not share"); }
  }

  function loadHash() {
    if (!location.hash) return false;
    try {
      const p = JSON.parse(decodeBase64Url(location.hash.slice(1)));
      if (typeof p.title === "string" && p.title.trim()) { ui.shareTitle.value=p.title.trim(); ui.sharedTitleMessage.textContent="Shared project: "+p.title.trim(); ui.sharedTitleMessage.hidden=false; document.title=p.title.trim()+" | C# Editor"; }
      if (typeof p.code === "string") ui.code.value = p.code;
      if (typeof p.stdin === "string") ui.stdin.value = p.stdin;
      if (typeof p.compiler === "string" && p.compiler) localStorage.setItem(K_COMPILER, p.compiler);
      if (Array.isArray(p.packages)) { installedPackages=p.packages.filter(x=>x&&x.id&&x.version); localStorage.setItem(K_PACKAGES,JSON.stringify(installedPackages)); }
      if (typeof p.sqlSimEnabled === "boolean") { ui.sqlSimEnabled.checked=p.sqlSimEnabled; localStorage.setItem(K_SQLSIM_ENABLED,String(p.sqlSimEnabled)); }
      if (p.sqlState && typeof p.sqlState === "object")
        saveSqlState(p.sqlState);
      return true;
    } catch { return false; }
  }

  function downloadBytes(name, data, type = "application/octet-stream") {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadCode() {
    downloadBytes("Program.cs", ui.code.value, "text/plain;charset=utf-8");
  }

  // ---------- IndexedDB files ----------
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "name" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB could not be opened"));
    });
    return dbPromise;
  }

  async function dbPutFile(file) {
    const db = await openDb();
    const record = { name: file.name, type: file.type || "application/octet-stream", size: file.size, modified: file.lastModified || Date.now(), data: await file.arrayBuffer() };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbListFiles() {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.name.localeCompare(b.name)));
      req.onerror = () => reject(req.error);
    });
  }

  async function dbGetFile(name) {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(name);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbDeleteFile(name) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(name);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function renderFiles(files) {
    projectFiles = Array.isArray(files) ? files : [];
    ui.downloadAllFiles.disabled = projectFiles.length === 0;
    if (!projectFiles.length) {
      ui.fileList.innerHTML = '<p class="emptyFiles">No project files yet.</p>';
      return;
    }
    ui.fileList.innerHTML = projectFiles.map(file => `
      <div class="fileRow">
        <span class="fileName" title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</span>
        <span class="fileSize">${formatFileSize(file.size)}</span>
        <span class="fileButtons">
          <button class="miniBtn" data-file-download="${escapeAttr(file.name)}" type="button">Download</button>
          <button class="miniBtn" data-file-delete="${escapeAttr(file.name)}" type="button">Delete</button>
        </span>
      </div>`).join("");
  }

  async function refreshFiles() {
    try { renderFiles(await dbListFiles()); }
    catch { ui.fileList.innerHTML = '<p class="emptyFiles">Browser file storage is unavailable.</p>'; }
  }

  async function uploadFiles() {
    const files = Array.from(ui.fileInput.files || []);
    if (!files.length) return;
    const maxFileSize = 20 * 1024 * 1024;
    if (files.some(f => f.size > maxFileSize)) {
      ui.fileInput.value = "";
      return toast("Each file must be 20 MB or smaller");
    }
    try {
      for (const file of files) await dbPutFile(file);
      ui.fileInput.value = "";
      await refreshFiles();
      toast(`${files.length} file${files.length === 1 ? "" : "s"} uploaded`);
    } catch {
      toast("Could not store files in this browser");
    }
  }

  async function downloadAllFiles() {
    if (!projectFiles.length) return;
    if (!window.JSZip) return toast("ZIP library is still loading");
    try {
      const zip = new JSZip();
      for (const item of projectFiles) {
        const record = await dbGetFile(item.name);
        if (record) zip.file(record.name, record.data);
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBytes("csharp-project-files.zip", blob, "application/zip");
      toast("ZIP downloaded");
    } catch { toast("Could not build ZIP"); }
  }

  // ---------- event wiring ----------
  ui.code.addEventListener("input", () => { updateGutter(); save(); });
  ui.code.addEventListener("scroll", syncHighlightScroll);
  ui.code.addEventListener("keydown", handleTypingAid);
  ui.stdin.addEventListener("input", save);

  ui.run.addEventListener("click", runCode);
  ui.stop.addEventListener("click", stopRun);
  ui.clear.addEventListener("click", () => {
    stopReading();
    ui.out.textContent = "Output will appear here.";
    ui.err.textContent = "Errors will appear here.";
    setStatus("Ready", "ok");
  });

  ui.font.addEventListener("change", () => applyFont(ui.font.value));
  ui.theme.addEventListener("click", () => applyTheme((document.body.dataset.theme || "light") === "light" ? "dark" : "light"));
  ui.fullscreenButtons.forEach(btn => btn.addEventListener("click", toggleFullscreen));
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      ui.app.classList.remove("fullscreen");
      document.body.classList.remove("fullscreen");
    }
    syncFullscreenButtons();
    scheduleEditorSync();
  });

  ui.share.addEventListener("click", shareProject);
  ui.shareTitle.addEventListener("input", save);
  ui.toggleSqlSim.addEventListener("click", () => {
    ui.sqlSimPanel.hidden = !ui.sqlSimPanel.hidden;
    if (!ui.sqlSimPanel.hidden) renderSqlState();
  });

  ui.sqlClose.addEventListener("click", () => {
    ui.sqlSimPanel.hidden = true;
  });

  ui.sqlLoadExample.addEventListener("click", loadSqlExample);
  ui.sqlSample.addEventListener("click", createCricketSample);

  ui.sqlToggleCreate.addEventListener("click", () => {
    ui.sqlCreateBox.hidden = !ui.sqlCreateBox.hidden;
    if (!ui.sqlCreateBox.hidden)
      ui.sqlNewTableName.focus();
  });

  ui.sqlCreateTable.addEventListener("click", createTableFromUi);
  ui.sqlCopyCreate.addEventListener("click", copyCreateTableSql);
  ui.sqlDropTable.addEventListener("click", dropSelectedTable);

  ui.sqlTableSelect.addEventListener("change", () => {
    const state = loadSqlState();
    renderSqlTable(
      findSqlTable(state, ui.sqlTableSelect.value)
    );
  });

  ui.sqlDbName.addEventListener("change", () => {
    const state = loadSqlState();
    state.database =
      String(ui.sqlDbName.value || "CricketDB").trim() ||
      "CricketDB";
    saveSqlState(state, ui.sqlTableSelect.value);
  });

  ui.sqlSimEnabled.addEventListener("change", () => {
    localStorage.setItem(
      K_SQLSIM_ENABLED,
      String(ui.sqlSimEnabled.checked)
    );
  });
  ui.codeFullscreen.addEventListener("click", toggleCodeFullscreen);
  document.querySelectorAll(".jsToggleBox").forEach(btn => btn.addEventListener("click", () => toggleIoBox(btn)));

  ui.compiler.addEventListener("change", () => localStorage.setItem(K_COMPILER, ui.compiler.value));
  ui.refreshCompiler.addEventListener("click", () => discoverCompilers(true));
  ui.downloadCode.addEventListener("click", downloadCode);
  ui.downloadCsproj.addEventListener("click", downloadCsproj);
  ui.downloadProject.addEventListener("click", downloadProjectZip);
  ui.installPackage.addEventListener("click", installNugetPackage);
  ui.nugetPackage.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      installNugetPackage();
    }
  });
  ui.togglePackages.addEventListener("click", () => {
    ui.packagePanel.hidden = !ui.packagePanel.hidden;
  });
  ui.closePackages.addEventListener("click", () => {
    ui.packagePanel.hidden = true;
  });
  ui.packageList.addEventListener("click", e => {
    const remove = e.target.closest("[data-package-remove]");
    if (!remove) return;
    const id = remove.dataset.packageRemove;
    installedPackages = installedPackages.filter(p => p.id.toLowerCase() !== String(id).toLowerCase());
    savePackages();
    toast(`${id} removed`);
  });

  ui.readOutput.checked = localStorage.getItem(K_READ_OUTPUT) === "true";
  ui.readOutput.addEventListener("change", () => {
    localStorage.setItem(K_READ_OUTPUT, String(ui.readOutput.checked));
    if (!ui.readOutput.checked) stopReading();
  });

  ui.copyOut.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(ui.out.textContent); toast("stdout copied"); }
    catch { toast("Copy blocked"); }
  });

  ui.uploadFiles.addEventListener("click", () => ui.fileInput.click());
  ui.fileInput.addEventListener("change", uploadFiles);
  ui.refreshFiles.addEventListener("click", refreshFiles);
  ui.downloadAllFiles.addEventListener("click", downloadAllFiles);
  ui.fileList.addEventListener("click", async e => {
    const download = e.target.closest("[data-file-download]");
    const remove = e.target.closest("[data-file-delete]");
    if (download) {
      const record = await dbGetFile(download.dataset.fileDownload);
      if (record) downloadBytes(record.name, record.data, record.type);
    }
    if (remove && confirm(`Delete ${remove.dataset.fileDelete}?`)) {
      await dbDeleteFile(remove.dataset.fileDelete);
      await refreshFiles();
      toast("File deleted");
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (ui.codeCard.classList.contains("codeExpanded")) { toggleCodeFullscreen(); return; }
    if (document.querySelector(".ioToggleCard.ioExpanded")) closeIoExpandedCards();
  });

  // ---------- initial state ----------
  loadPackages();
  ui.shareTitle.value=localStorage.getItem(K_SHARE_TITLE)||"";
  ui.sqlSimEnabled.checked=localStorage.getItem(K_SQLSIM_ENABLED)!=="false";
  renderSqlState();
  const fromShare = loadHash();
  renderPackages();
  if (!fromShare) {
    const savedCode = localStorage.getItem(K_CODE);
    const savedStdin = localStorage.getItem(K_STDIN);
    if (savedCode) ui.code.value = savedCode;
    if (savedStdin !== null) ui.stdin.value = savedStdin;
  }

  applyTheme(localStorage.getItem(K_THEME) || "light");
  const font = localStorage.getItem(K_FONT) || "16";
  ui.font.value = font;
  applyFont(font);
  updateGutter();
  installEditorLayoutWatchers();
  setBusy(false);
  discoverCompilers();
  refreshFiles();
  renderSqlState();
})();
