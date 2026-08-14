
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
      function saveQuery(kind, sql, errorMessage = "") {
        const key = historyKey(kind);
        const items = readHistory(key);
        items.unshift({ id: Date.now() + "-" + Math.random().toString(16).slice(2), sql, error: errorMessage, time: new Date().toLocaleString() });
        try { localStorage.setItem(key, JSON.stringify(items.slice(0, 100))); }
        catch (_) { /* Keep SQL usable if storage is unavailable. */ }
        renderQueryHistory();
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

      const shareDialog = document.getElementById("shareDialog");
      const sharePreview = document.getElementById("sharePreview");
      const shareSource = document.getElementById("shareSource");
      const shareWarning = document.getElementById("shareWarning");
      const shareStatus = document.getElementById("shareStatus");
      const shareCharCount = document.getElementById("shareCharCount");
      const shareLinkSize = document.getElementById("shareLinkSize");
      let shareRefreshToken = 0;

      function selectedOrCompleteSql() {
        const start = sqlInput.selectionStart;
        const end = sqlInput.selectionEnd;
        const selected = start !== end ? sqlInput.value.slice(start, end).trim() : "";
        return { sql: selected || sqlInput.value.trim(), selected: Boolean(selected) };
      }
      function bytesToBase64Url(bytes) {
        let binary = "";
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
      }
      function base64UrlToBytes(value) {
        const base64 = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
        const binary = atob(base64);
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
      }
      async function compressText(text) {
        const input = new TextEncoder().encode(text);
        if (!("CompressionStream" in window)) return { prefix: "sqlb=", bytes: input };
        const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("gzip"));
        return { prefix: "sqlz=", bytes: new Uint8Array(await new Response(stream).arrayBuffer()) };
      }
      async function decompressText(bytes) {
        if (!("DecompressionStream" in window)) throw new Error("This browser cannot open compressed SQL links.");
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
        return new TextDecoder().decode(await new Response(stream).arrayBuffer());
      }
      async function buildShareUrl(sql = sharePreview.value.trim()) {
        const url = new URL(window.location.href);
        url.searchParams.delete("sql");
        if (!sql) url.hash = "";
        else {
          const payload = await compressText(sql);
          url.hash = payload.prefix + bytesToBase64Url(payload.bytes);
        }
        return url.toString();
      }
      async function copyText(text, successMessage) {
        try {
          await navigator.clipboard.writeText(text);
        } catch (_) {
          const helper = document.createElement("textarea");
          helper.value = text;
          helper.style.position = "fixed";
          helper.style.opacity = "0";
          document.body.appendChild(helper);
          helper.select();
          const copied = document.execCommand("copy");
          helper.remove();
          if (!copied) throw new Error("Clipboard unavailable");
        }
        shareStatus.textContent = successMessage;
      }
      function shareMessage(sql, url) {
        const firstLine = sql.split(/\r?\n/).find((line) => line.trim()) || "SQL query";
        const preview = firstLine.trim().slice(0, 90);
        return "Open this SQL query in Programmer’s Picnic SQL:\n\n" + preview + (firstLine.length > 90 ? "…" : "") + "\n\n" + url;
      }
      async function refreshShareDetails() {
        const token = ++shareRefreshToken;
        const sql = sharePreview.value.trim();
        shareCharCount.textContent = sql.length.toLocaleString() + " characters";
        shareLinkSize.textContent = "Preparing compact link…";
        try {
          const url = await buildShareUrl(sql);
          if (token !== shareRefreshToken) return;
          shareLinkSize.textContent = url.length.toLocaleString() + "-character compact link";
          shareWarning.classList.toggle("visible", url.length > 4000);
        } catch (_) {
          shareLinkSize.textContent = "Could not prepare link";
          shareWarning.classList.add("visible");
        }
      }
      function openShareDialog() {
        const content = selectedOrCompleteSql();
        if (!content.sql) {
          show("Write a SQL query before sharing.", false);
          return;
        }
        sharePreview.value = content.sql;
        shareSource.textContent = content.selected
          ? "Sharing the highlighted portion of the editor. You can edit it below."
          : "No text was highlighted, so the complete query is ready to share. You can edit it below.";
        shareStatus.textContent = "";
        refreshShareDetails();
        shareDialog.showModal();
      }
      async function loadSharedSql() {
        const hash = window.location.hash.slice(1);
        if (!/^sql(?:z|b)?=/.test(hash)) return;
        try {
          if (hash.startsWith("sqlz=")) sqlInput.value = await decompressText(base64UrlToBytes(hash.slice(5)));
          else if (hash.startsWith("sqlb=")) sqlInput.value = new TextDecoder().decode(base64UrlToBytes(hash.slice(5)));
          else sqlInput.value = decodeURIComponent(hash.slice(4));
          result.textContent = "Shared SQL loaded. Review it, then click Run SQL.";
        } catch (e) { show("This shared SQL link is damaged or incomplete.", false); }
      }
      document.getElementById("shareBtn").onclick = openShareDialog;
      sharePreview.addEventListener("input", () => { shareStatus.textContent = ""; refreshShareDetails(); });
      document.getElementById("copyShareLinkBtn").onclick = async () => copyText(await buildShareUrl(), "Compact share link copied.");
      document.getElementById("copyShareSqlBtn").onclick = () => copyText(sharePreview.value.trim(), "SQL copied.");
      document.getElementById("downloadShareSqlBtn").onclick = () => {
        download("shared-query.sql", sharePreview.value.trim() + "\n", "text/plain;charset=utf-8");
        shareStatus.textContent = "SQL file downloaded.";
      };
      document.getElementById("whatsappShareBtn").onclick = async () => {
        const url = await buildShareUrl();
        window.open("https://wa.me/?text=" + encodeURIComponent("Open this SQL query in Programmer’s Picnic SQL:\n" + url), "_blank", "noopener");
      };
      document.getElementById("emailShareBtn").onclick = async () => {
        const url = await buildShareUrl();
        window.location.href = "mailto:?subject=" + encodeURIComponent("SQL query from Programmer’s Picnic") + "&body=" + encodeURIComponent(shareMessage(sharePreview.value.trim(), url));
      };
      document.getElementById("nativeShareBtn").onclick = async () => {
        const sql = sharePreview.value.trim();
        const url = await buildShareUrl(sql);
        if (!navigator.share) return copyText(url, "Your browser has no share menu, so the link was copied.");
        try {
          await navigator.share({ title: "Programmer’s Picnic SQL", text: "Open this SQL query in the browser editor.", url });
          shareStatus.textContent = "Shared successfully.";
        } catch (err) { if (!err || err.name !== "AbortError") shareStatus.textContent = "Sharing was not completed."; }
      };
      function closeShareDialog() { shareDialog.close(); sqlInput.focus(); }
      document.getElementById("closeShareBtn").onclick = closeShareDialog;
      document.getElementById("closeShareActionBtn").onclick = closeShareDialog;
      shareDialog.addEventListener("click", (event) => { if (event.target === shareDialog) closeShareDialog(); });
      loadSharedSql();

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
    
