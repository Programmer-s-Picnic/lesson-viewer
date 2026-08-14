
      let db,
        SQLLib,
        lastResult = null;
      const sqlInput = document.getElementById("sqlInput");
      const result = document.getElementById("result");
      const runBtn = document.getElementById("runBtn");
      const resetBtn = document.getElementById("resetBtn");
      const dataFileInput = document.getElementById("dataFileInput");
      const tableNameInput = document.getElementById("tableNameInput");
      const exportCsvBtn = document.getElementById("exportCsvBtn");
      const exportJsonBtn = document.getElementById("exportJsonBtn");
      const successfulTab = document.getElementById("successfulTab");
      const unsuccessfulTab = document.getElementById("unsuccessfulTab");
      const successfulCount = document.getElementById("successfulCount");
      const unsuccessfulCount = document.getElementById("unsuccessfulCount");
      const queryHistoryList = document.getElementById("queryHistoryList");
      const clearShownHistoryBtn = document.getElementById("clearShownHistoryBtn");
      const HISTORY_SUCCESS_KEY = "pp_sql_history_success_v1";
      const HISTORY_FAIL_KEY = "pp_sql_history_fail_v1";
      let activeHistory = "success";

      function readHistory(key) {
        try { return JSON.parse(localStorage.getItem(key) || "[]"); }
        catch (_) { return []; }
      }
      function historyKey(kind) {
        return kind === "success" ? HISTORY_SUCCESS_KEY : HISTORY_FAIL_KEY;
      }
      function queryIdentity(sql) {
        return String(sql || "")
          .trim()
          .replace(/\r\n?/g, "\n")
          .replace(/[ \t]+$/gm, "")
          .replace(/;+\s*$/, "")
          .trim();
      }
      function saveQuery(kind, sql, errorMessage = "") {
        const key = historyKey(kind);
        const otherKey = historyKey(kind === "success" ? "fail" : "success");
        const identity = queryIdentity(sql);
        const items = readHistory(key).filter((item) => queryIdentity(item.sql) !== identity);
        const otherItems = readHistory(otherKey).filter((item) => queryIdentity(item.sql) !== identity);
        items.unshift({ id: Date.now() + "-" + Math.random().toString(16).slice(2), sql, error: errorMessage, time: new Date().toLocaleString() });
        try {
          localStorage.setItem(key, JSON.stringify(items.slice(0, 100)));
          localStorage.setItem(otherKey, JSON.stringify(otherItems.slice(0, 100)));
        }
        catch (_) { /* Keep SQL usable if storage is unavailable. */ }
        renderQueryHistory();
      }
      function removeExistingHistoryDuplicates() {
        const successful = [];
        const seen = new Set();
        for (const item of readHistory(HISTORY_SUCCESS_KEY)) {
          const identity = queryIdentity(item.sql);
          if (!identity || seen.has(identity)) continue;
          seen.add(identity);
          successful.push(item);
        }
        const unsuccessful = [];
        for (const item of readHistory(HISTORY_FAIL_KEY)) {
          const identity = queryIdentity(item.sql);
          if (!identity || seen.has(identity)) continue;
          seen.add(identity);
          unsuccessful.push(item);
        }
        try {
          localStorage.setItem(HISTORY_SUCCESS_KEY, JSON.stringify(successful.slice(0, 100)));
          localStorage.setItem(HISTORY_FAIL_KEY, JSON.stringify(unsuccessful.slice(0, 100)));
        } catch (_) {}
      }
      function renderQueryHistory() {
        const successful = readHistory(HISTORY_SUCCESS_KEY);
        const unsuccessful = readHistory(HISTORY_FAIL_KEY);
        successfulCount.textContent = successful.length;
        unsuccessfulCount.textContent = unsuccessful.length;
        successfulTab.classList.toggle("active", activeHistory === "success");
        unsuccessfulTab.classList.toggle("active", activeHistory === "fail");
        const items = activeHistory === "success" ? successful : unsuccessful;
        queryHistoryList.innerHTML = items.length ? items.map((item, index) => `
          <article class="history-item">
            <div class="history-meta"><span>${escapeHtml(item.time || item.ts || "")}</span><span>${activeHistory === "success" ? "Successful" : "Unsuccessful"}</span></div>
            <pre>${escapeHtml(item.sql || "")}</pre>
            ${item.error || item.err ? `<div class="history-error">${escapeHtml(item.error || item.err)}</div>` : ""}
            <div class="row">
              <button type="button" data-history-action="view" data-history-index="${index}">View</button>
              <button type="button" data-history-action="copy" data-history-index="${index}">Copy</button>
              <button type="button" data-history-action="share" data-history-index="${index}">Share</button>
              <button type="button" data-history-action="remove" data-history-index="${index}">Remove</button>
            </div>
          </article>`).join("") : '<div class="hint">No saved queries in this list.</div>';
      }

      function escapeHtml(value) {
        return String(value)
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }
      function safeName(name) {
        let s = String(name || "my_data")
          .trim()
          .replace(/\.[^.]+$/, "")
          .replace(/[^A-Za-z0-9_]+/g, "_")
          .replace(/^_+|_+$/g, "");
        if (!s) s = "my_data";
        if (/^\d/.test(s)) s = "t_" + s;
        return s;
      }
      function quoteIdent(name) {
        return '"' + String(name).replaceAll('"', '""') + '"';
      }
      function show(msg, good) {
        result.innerHTML = `<span class="${good ? "ok" : "bad"}">${escapeHtml(msg)}</span>`;
      }
      function setExportState(on) {
        exportCsvBtn.disabled = !on;
        exportJsonBtn.disabled = !on;
      }

      function initDB() {
        db = new SQLLib.Database();
        db.run(`CREATE TABLE students (id INTEGER, name TEXT);
          INSERT INTO students VALUES (1,'Champak'),(2,'Roy'),(3,'SQL Student');`);
        lastResult = null;
        setExportState(false);
      }

      function renderTable(rs) {
        let html =
          "<table><tr>" +
          rs.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("") +
          "</tr>";
        rs.values.forEach((row) => {
          html +=
            "<tr>" +
            row
              .map((v) => `<td>${escapeHtml(v === null ? "NULL" : v)}</td>`)
              .join("") +
            "</tr>";
        });
        html += "</table>";
        result.innerHTML = html;
      }

      function getSqlToRun() {
        const start = sqlInput.selectionStart;
        const end = sqlInput.selectionEnd;

        if (typeof start === "number" && typeof end === "number" && start !== end) {
          return sqlInput.value.slice(start, end);
        }

        return sqlInput.value;
      }

      function runSQL() {
        if (!db) {
          show("SQLite is still loading. Please try again shortly.", false);
          return;
        }
        const executedSql = getSqlToRun().trim();
        if (!executedSql) {
          show("Write or select a SQL query before running it.", false);
          return;
        }
        try {
          const res = db.exec(executedSql);
          if (!res.length) {
            lastResult = null;
            setExportState(false);
            result.innerText = "Query executed successfully. No rows returned.";
            saveQuery("success", executedSql);
            return;
          }
          lastResult = res[res.length - 1];
          setExportState(true);
          renderTable(lastResult);
          saveQuery("success", executedSql);
        } catch (err) {
          lastResult = null;
          setExportState(false);
          result.innerText = err.message || String(err);
          saveQuery("fail", executedSql, err.message || String(err));
        }
      }

      function parseCSV(text) {
        const rows = [];
        let row = [],
          cell = "",
          q = false;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i],
            next = text[i + 1];
          if (q) {
            if (ch === '"' && next === '"') {
              cell += '"';
              i++;
            } else if (ch === '"') {
              q = false;
            } else cell += ch;
            continue;
          }
          if (ch === '"') {
            q = true;
            continue;
          }
          if (ch === ",") {
            row.push(cell);
            cell = "";
            continue;
          }
          if (ch === "\r") continue;
          if (ch === "\n") {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
            continue;
          }
          cell += ch;
        }
        row.push(cell);
        if (row.length > 1 || row[0].trim()) rows.push(row);
        if (!rows.length) throw new Error("CSV is empty.");
        const headers = rows[0].map((h, i) => safeName(h || "col_" + (i + 1)));
        const data = rows
          .slice(1)
          .map((r) => headers.map((_, i) => r[i] ?? null));
        return { headers, rows: data };
      }

      function jsonToTable(data) {
        if (
          Array.isArray(data) &&
          data.length &&
          typeof data[0] === "object" &&
          !Array.isArray(data[0])
        ) {
          const keys = [...new Set(data.flatMap((o) => Object.keys(o)))];
          return {
            headers: keys.map(safeName),
            rows: data.map((o) => keys.map((k) => o[k] ?? null)),
          };
        }
        if (Array.isArray(data) && data.length && Array.isArray(data[0])) {
          const headers = data[0].map((h, i) =>
            safeName(h || "col_" + (i + 1)),
          );
          return {
            headers,
            rows: data.slice(1).map((r) => headers.map((_, i) => r[i] ?? null)),
          };
        }
        throw new Error(
          "JSON must be an array of objects or an array of arrays.",
        );
      }

      function createTable(tableName, headers, rows) {
        const cols = headers.map((h) => quoteIdent(h) + " TEXT").join(", ");
        db.run("DROP TABLE IF EXISTS " + quoteIdent(tableName));
        db.run("CREATE TABLE " + quoteIdent(tableName) + " (" + cols + ")");
        if (!rows.length) return;
        const stmt = db.prepare(
          "INSERT INTO " +
            quoteIdent(tableName) +
            " VALUES (" +
            headers.map(() => "?").join(",") +
            ")",
        );
        try {
          rows.forEach((r) =>
            stmt.run(r.map((v) => (v == null ? null : String(v)))),
          );
        } finally {
          stmt.free();
        }
      }

      function readFileText(file) {
        return new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result || "");
          r.onerror = () => reject(new Error("Could not read file."));
          r.readAsText(file);
        });
      }
      async function importData(kind) {
        const file = dataFileInput.files && dataFileInput.files[0];
        if (!file) {
          show("Please choose a CSV or JSON file first.", false);
          return;
        }
        try {
          const text = await readFileText(file);
          const spec =
            kind === "csv" ? parseCSV(text) : jsonToTable(JSON.parse(text));
          const tableName = safeName(
            tableNameInput.value || file.name || "my_data",
          );
          tableNameInput.value = tableName;
          createTable(tableName, spec.headers, spec.rows);
          sqlInput.value =
            "SELECT * FROM " + quoteIdent(tableName) + " LIMIT 100;";
          runSQL();
        } catch (err) {
          show(
            (kind === "csv" ? "CSV" : "JSON") +
              " import failed: " +
              (err.message || String(err)),
            false,
          );
        }
      }

      function toCSV(columns, values) {
        const cell = (v) => {
          if (v == null) return "";
          let s = String(v);
          return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
        };
        return [
          columns.map(cell).join(","),
          ...values.map((r) => r.map(cell).join(",")),
        ].join("\n");
      }
      function download(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      function exportCSV() {
        if (!lastResult) return;
        download(
          "result.csv",
          toCSV(lastResult.columns, lastResult.values),
          "text/csv;charset=utf-8",
        );
      }
      function exportJSON() {
        if (!lastResult) return;
        const rows = lastResult.values.map((r) =>
          Object.fromEntries(lastResult.columns.map((c, i) => [c, r[i]])),
        );
        download(
          "result.json",
          JSON.stringify(rows, null, 2),
          "application/json;charset=utf-8",
        );
      }

      runBtn.disabled = true;
      resetBtn.disabled = true;
      initSqlJs({
        locateFile: (file) =>
          `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
      }).then((SQL) => {
        SQLLib = SQL;
        initDB();
        runBtn.disabled = false;
        resetBtn.disabled = false;
        result.innerText = "SQLite ready. Click Run SQL.";
      }).catch((err) => {
        show("SQLite could not be loaded. Check your connection and reload the page. " + (err?.message || ""), false);
      });
      runBtn.onclick = runSQL;
      resetBtn.onclick = () => {
        initDB();
        result.innerText = "Database reset.";
      };
      sqlInput.addEventListener("keydown", (ev) => {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
          ev.preventDefault();
          runSQL();
        }
      });
      document.querySelectorAll(".chip").forEach((btn) => {
        btn.onclick = () => {
          sqlInput.value = btn.dataset.sql;
        };
      });
      document.getElementById("importCsvBtn").onclick = () => importData("csv");
      document.getElementById("importJsonBtn").onclick = () =>
        importData("json");
      exportCsvBtn.onclick = exportCSV;
      exportJsonBtn.onclick = exportJSON;

      successfulTab.onclick = () => { activeHistory = "success"; renderQueryHistory(); };
      unsuccessfulTab.onclick = () => { activeHistory = "fail"; renderQueryHistory(); };
      queryHistoryList.onclick = async (event) => {
        const button = event.target.closest("button[data-history-action]");
        if (!button) return;
        const key = historyKey(activeHistory);
        const items = readHistory(key);
        const index = Number(button.dataset.historyIndex);
        const item = items[index];
        if (!item) return;
        if (button.dataset.historyAction === "view") {
          sqlInput.value = item.sql || "";
          sqlInput.focus();
          sqlInput.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (button.dataset.historyAction === "copy") {
          try { await navigator.clipboard.writeText(item.sql || ""); button.textContent = "Copied"; }
          catch (_) { window.prompt("Copy this SQL:", item.sql || ""); }
        } else if (button.dataset.historyAction === "share") {
          await shareSQL(item.sql || "");
        } else if (button.dataset.historyAction === "remove") {
          items.splice(index, 1);
          try { localStorage.setItem(key, JSON.stringify(items)); } catch (_) {}
          renderQueryHistory();
        }
      };
      clearShownHistoryBtn.onclick = () => {
        const label = activeHistory === "success" ? "successful" : "unsuccessful";
        if (!confirm(`Remove all ${label} saved queries?`)) return;
        try { localStorage.setItem(historyKey(activeHistory), "[]"); } catch (_) {}
        renderQueryHistory();
      };
      removeExistingHistoryDuplicates();
      renderQueryHistory();

      const themeToggleBtn = document.getElementById("themeToggleBtn");
      function setTheme(theme) {
        const isLight = theme === "light";
        document.body.classList.toggle("light", isLight);
        themeToggleBtn.textContent = isLight ? "☀️ Light" : "🌙 Dark";
        try { localStorage.setItem("pp_sql_theme", isLight ? "light" : "dark"); } catch (_) {}
      }
      themeToggleBtn.onclick = () =>
        setTheme(document.body.classList.contains("light") ? "dark" : "light");
      let savedTheme = "dark";
      try { savedTheme = localStorage.getItem("pp_sql_theme") || "dark"; } catch (_) {}
      setTheme(savedTheme);

      function currentSQLForSharing() {
        const start = sqlInput.selectionStart;
        const end = sqlInput.selectionEnd;
        const selected = start !== end ? sqlInput.value.slice(start, end).trim() : "";
        return selected || sqlInput.value.trim();
      }

      function buildSimpleShareUrl(sql) {
        const url = new URL(window.location.href);
        url.hash = "sql=" + encodeURIComponent(sql);
        return url.toString();
      }

      async function shareSQL(sql) {
        sql = String(sql || "").trim();
        if (!sql) {
          show("Write a SQL query before sharing.", false);
          return;
        }
        const url = buildSimpleShareUrl(sql);
        if (navigator.share) {
          try {
            await navigator.share({
              title: "Programmer’s Picnic SQL",
              text: "SQL query:\n\n" + sql,
              url,
            });
            return;
          } catch (error) {
            if (error && error.name === "AbortError") return;
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          show("Sharing is unavailable, so the SQL link was copied.", true);
        } catch (_) {
          window.prompt("Copy this SQL link:", url);
        }
      }

      function buildAllSQLText() {
        const successful = readHistory(HISTORY_SUCCESS_KEY);
        const unsuccessful = readHistory(HISTORY_FAIL_KEY);
        const sections = [];
        const current = sqlInput.value.trim();

        sections.push(
          "-- PROGRAMMER'S PICNIC SQL EXPORT",
          "-- Created: " + new Date().toLocaleString(),
          "",
          "-- ==================================================",
          "-- CURRENT EDITOR SQL",
          "-- ==================================================",
          current || "-- No SQL in the editor.",
        );

        sections.push(
          "",
          "-- ==================================================",
          "-- SUCCESSFUL QUERIES (" + successful.length + ")",
          "-- ==================================================",
        );
        if (!successful.length) sections.push("-- No successful queries saved.");
        successful.forEach((item, index) => {
          sections.push(
            "",
            "-- Successful query " + (index + 1) + (item.time ? " | " + item.time : ""),
            String(item.sql || "").trim(),
          );
        });

        sections.push(
          "",
          "-- ==================================================",
          "-- FAILED QUERIES (" + unsuccessful.length + ")",
          "-- ==================================================",
        );
        if (!unsuccessful.length) sections.push("-- No failed queries saved.");
        unsuccessful.forEach((item, index) => {
          const error = item.error || item.err || "Unknown SQL error";
          sections.push(
            "",
            "-- Failed query " + (index + 1) + (item.time ? " | " + item.time : ""),
            "-- Error: " + String(error).replace(/\r?\n/g, " "),
            String(item.sql || "").trim(),
          );
        });

        return sections.join("\n").trim() + "\n";
      }

      async function shareAllSQL() {
        const text = buildAllSQLText();
        const file = typeof File === "function"
          ? new File([text], "programmers-picnic-sql-history.sql", { type: "text/plain;charset=utf-8" })
          : null;

        if (navigator.share) {
          try {
            const fileData = {
              title: "Programmer’s Picnic SQL",
              text: "Current SQL, successful queries and failed queries.",
              files: [file],
            };
            if (file && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
              await navigator.share(fileData);
            } else {
              await navigator.share({ title: fileData.title, text });
            }
            return;
          } catch (error) {
            if (error && error.name === "AbortError") return;
          }
        }

        try {
          await navigator.clipboard.writeText(text);
          show("All editor, successful and failed SQL queries were copied.", true);
        } catch (_) {
          download("programmers-picnic-sql-history.sql", text, "text/plain;charset=utf-8");
          show("All SQL queries were downloaded because sharing is unavailable.", true);
        }
      }

      function loadSharedSQL() {
        if (!window.location.hash.startsWith("#sql=")) return;
        try {
          sqlInput.value = decodeURIComponent(window.location.hash.slice(5));
        } catch (_) {
          show("This shared SQL link is damaged or incomplete.", false);
        }
      }

      document.getElementById("shareBtn").onclick = shareAllSQL;
      loadSharedSQL();


      const fsBtn = document.getElementById("fullscreenBtn");
      fsBtn.onclick = async () => {
        if (!document.fullscreenElement)
          await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      };
      document.addEventListener("fullscreenchange", () => {
        fsBtn.textContent = document.fullscreenElement
          ? "⛶ Exit Full Screen"
          : "⛶ Full Screen";
      });
    
