
(function () {
  var LS_SUCCESS = "pp_sql_history_success_v1";
  var LS_FAIL = "pp_sql_history_fail_v1";
  var LS_THEME = "pp_sql_theme_v1";

  var db = null;
  var SQLlib = null;
  var activeTab = "success";
  var lastSelectResult = null;

  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");
  var csvHint = document.getElementById("csvHint");

  var sqlInput = document.getElementById("sqlInput");
  var runBtn = document.getElementById("runBtn");
  var resetBtn = document.getElementById("resetBtn");
  var copySqlBtn = document.getElementById("copySqlBtn");
  var shareSqlBtn = document.getElementById("shareSqlBtn");
  var downloadCsvBtn = document.getElementById("downloadCsvBtn");
  var downloadJsonBtn = document.getElementById("downloadJsonBtn");
  var copyCsvBtn = document.getElementById("copyCsvBtn");

  var metaMsg = document.getElementById("metaMsg");
  var metaRows = document.getElementById("metaRows");
  var metaRowsInline = document.getElementById("metaRowsInline");
  var resultDiv = document.getElementById("result");
  var resultBox = document.querySelector(".result");
  var errorDiv = document.getElementById("error");

  var historyList = document.getElementById("historyList");
  var histCount = document.getElementById("histCount");
  var tabSuccess = document.getElementById("tabSuccess");
  var tabFail = document.getElementById("tabFail");

  var exportHistoryBtn = document.getElementById("exportHistoryBtn");
  var importHistoryBtn = document.getElementById("importHistoryBtn");
  var clearHistoryBtn = document.getElementById("clearHistoryBtn");
  var importFile = document.getElementById("importFile");

  var sqliteFile = document.getElementById("sqliteFile");
  var loadDbBtn = document.getElementById("loadDbBtn");
  var useSampleBtn = document.getElementById("useSampleBtn");

  var dataFile = document.getElementById("dataFile");
  var importTableName = document.getElementById("importTableName");
  var loadCsvBtn = document.getElementById("loadCsvBtn");
  var loadJsonBtn = document.getElementById("loadJsonBtn");
  var exportDbBtn = document.getElementById("exportDbBtn");

  var toggleHelpBtn = document.getElementById("toggleHelpBtn");
  var helpSearch = document.getElementById("helpSearch");
  var helpBox = document.getElementById("helpBox");
  var helpResults = document.getElementById("helpResults");

  var themeToggleBtn = document.getElementById("themeToggleBtn");
  var shareBtn = document.getElementById("shareBtn");
  var activityRunBtn = document.getElementById("activityRunBtn");
  var activityHistoryBtn = document.getElementById("activityHistoryBtn");
  var activityHelpBtn = document.getElementById("activityHelpBtn");

  var ppDotMirror = document.getElementById("ppDotMirror");
  var ppStatusMirror = document.getElementById("ppStatusMirror");

  var schemaList = document.getElementById("schemaList");

  function mirrorStatus(text, ok) {
    ppStatusMirror.textContent = text || "Ready.";
    ppDotMirror.className = "dot" + (ok ? " ok" : "");
  }

  function nowISO() {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  function readLS(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return [];
    }
  }

  function writeLS(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function enableDbLoadUI(ready) {
    loadDbBtn.disabled = !ready;
    useSampleBtn.disabled = !ready;
    loadCsvBtn.disabled = !ready;
    loadJsonBtn.disabled = !ready;
    exportDbBtn.disabled = !ready;
  }

  function setStatus(ready) {
    if (ready) {
      statusDot.className = "dot ok";
      statusText.textContent = "DB Ready ✅";
      runBtn.disabled = false;
      resetBtn.disabled = false;
      exportHistoryBtn.disabled = false;
      importHistoryBtn.disabled = false;
      clearHistoryBtn.disabled = false;
      copySqlBtn.disabled = false;
      shareSqlBtn.disabled = false;
      downloadCsvBtn.disabled = !lastSelectResult;
      downloadJsonBtn.disabled = !lastSelectResult;
      copyCsvBtn.disabled = !lastSelectResult;
      enableDbLoadUI(true);
      mirrorStatus("SQLite ready", true);
    } else {
      statusDot.className = "dot";
      statusText.textContent = "Loading SQLite…";
      runBtn.disabled = true;
      resetBtn.disabled = true;
      exportHistoryBtn.disabled = true;
      importHistoryBtn.disabled = true;
      clearHistoryBtn.disabled = true;
      copySqlBtn.disabled = true;
      shareSqlBtn.disabled = true;
      downloadCsvBtn.disabled = true;
      downloadJsonBtn.disabled = true;
      copyCsvBtn.disabled = true;
      enableDbLoadUI(false);
      mirrorStatus("Loading SQLite…", false);
    }
  }

  function clearOutput() {
    resultDiv.innerHTML = "";
    errorDiv.textContent = "";
    errorDiv.style.display = "none";
    metaRows.textContent = "";
    if (metaRowsInline) metaRowsInline.textContent = "";
    if (resultBox) {
      resultBox.classList.remove("flash-success", "flash-error", "result-animate");
    }
  }


  function flashResultState(kind) {
    if (!resultBox) return;

    resultBox.classList.remove("flash-success", "flash-error", "result-animate");

    void resultBox.offsetWidth;

    resultBox.classList.add("result-animate");
    resultBox.classList.add(kind === "error" ? "flash-error" : "flash-success");
  }


  function showInfo(msg) {
    metaMsg.innerHTML =
      '<span class="muted small">' + escapeHtml(msg) + "</span>";
    mirrorStatus(msg, true);
  }

  function showOk(msg) {
    metaMsg.innerHTML =
      '<span class="ok">✅ ' + escapeHtml(msg) + "</span>";
    mirrorStatus(msg, true);
  }

  function showErr(msg) {
    errorDiv.style.display = "block";
    errorDiv.textContent = msg;
    metaMsg.innerHTML = '<span class="danger">❌ Error</span>';
    mirrorStatus("Error: " + String(msg || ""), false);
  }

  function showExecutionSummary(ok, msg, ms) {
    var stamp = nowISO();
    if (ok) {
      metaMsg.innerHTML =
        '<span class="ok">✅ ' +
        escapeHtml(msg) +
        "</span>" +
        ' <span class="muted small">(' +
        escapeHtml(String(ms)) +
        " ms • " +
        escapeHtml(stamp) +
        ")</span>";
      mirrorStatus(msg + " — " + ms + " ms", true);
    } else {
      metaMsg.innerHTML =
        '<span class="danger">❌ ' +
        escapeHtml(msg) +
        "</span>" +
        ' <span class="muted small">(' +
        escapeHtml(String(ms)) +
        " ms • " +
        escapeHtml(stamp) +
        ")</span>";
      mirrorStatus(msg, false);
    }
  }

  function applyTheme(theme) {
    var t = theme === "light" ? "light" : "dark";
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add("theme-" + t);

    if (themeToggleBtn) {
      themeToggleBtn.textContent = t === "dark" ? "🌙 Dark" : "☀ Light";
      themeToggleBtn.title =
        t === "dark" ? "Switch to light theme" : "Switch to dark theme";
    }

    try {
      localStorage.setItem(LS_THEME, t);
    } catch (e) {}
  }

  function initTheme() {
    var saved = "dark";
    try {
      saved = localStorage.getItem(LS_THEME) || "dark";
    } catch (e) {}
    applyTheme(saved);
  }

  function quoteIdent(name) {
    return '"' + String(name).replaceAll('"', '""') + '"';
  }

  function makeSafeTableName(raw) {
    var s = String(raw || "")
      .trim()
      .replace(/\.[^.]+$/, "")
      .replace(/[^A-Za-z0-9_]+/g, "_")
      .replace(/^_+/, "")
      .replace(/_+/g, "_");

    if (!s) s = "imported_data";
    if (/^[0-9]/.test(s)) s = "t_" + s;
    return s;
  }

  function getImportTableName(fileName) {
    var fromInput = (importTableName.value || "").trim();
    if (fromInput) return makeSafeTableName(fromInput);
    return makeSafeTableName(fileName || "imported_data");
  }

  function isNumericLike(v) {
    if (v === null || v === undefined || v === "") return false;
    return /^-?\d+(\.\d+)?$/.test(String(v).trim());
  }

  function isIntegerLike(v) {
    if (v === null || v === undefined || v === "") return false;
    return /^-?\d+$/.test(String(v).trim());
  }

  function isBooleanLike(v) {
    if (typeof v === "boolean") return true;
    var s = String(v || "").trim().toLowerCase();
    return s === "true" || s === "false";
  }

  function normalizeCell(v) {
    if (v === undefined) return null;
    if (v === null) return null;

    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;

    var s = String(v).trim();
    if (s === "") return null;
    if (isBooleanLike(s)) return s.toLowerCase() === "true" ? 1 : 0;
    if (isIntegerLike(s)) return parseInt(s, 10);
    if (isNumericLike(s)) return parseFloat(s);
    return String(v);
  }

  function inferColumnType(values) {
    var hasText = false;
    var hasReal = false;
    var hasInteger = false;

    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (v === null || v === undefined || v === "") continue;

      if (typeof v === "number") {
        if (Number.isInteger(v)) hasInteger = true;
        else hasReal = true;
        continue;
      }

      if (typeof v === "boolean") {
        hasInteger = true;
        continue;
      }

      var s = String(v).trim();
      if (s === "") continue;

      if (isBooleanLike(s)) {
        hasInteger = true;
      } else if (isIntegerLike(s)) {
        hasInteger = true;
      } else if (isNumericLike(s)) {
        hasReal = true;
      } else {
        hasText = true;
      }
    }

    if (hasText) return "TEXT";
    if (hasReal) return "REAL";
    if (hasInteger) return "INTEGER";
    return "TEXT";
  }

  function arrayOfObjectsToTableSpec(rows) {
    if (!Array.isArray(rows) || !rows.length) {
      throw new Error("JSON array is empty.");
    }

    var allKeys = [];
    var seen = Object.create(null);

    rows.forEach(function (row) {
      if (!row || Array.isArray(row) || typeof row !== "object") {
        throw new Error("Expected an array of objects.");
      }
      Object.keys(row).forEach(function (k) {
        var safe = makeSafeTableName(k);
        if (!seen[safe]) {
          seen[safe] = true;
          allKeys.push({ original: k, safe: safe });
        }
      });
    });

    var headers = allKeys.map(function (x) {
      return x.safe;
    });

    var values = rows.map(function (row) {
      return allKeys.map(function (k) {
        return row[k.original];
      });
    });

    return { headers: headers, rows: values };
  }

  function arrayOfArraysToTableSpec(data) {
    if (!Array.isArray(data) || !data.length) {
      throw new Error("JSON array is empty.");
    }

    var first = data[0];
    if (!Array.isArray(first)) {
      throw new Error("Expected an array of arrays.");
    }

    var headers = first.map(function (h, idx) {
      var raw = String(h || "").trim() || "col_" + (idx + 1);
      return makeSafeTableName(raw);
    });

    var rows = data.slice(1).map(function (row) {
      var arr = Array.isArray(row) ? row : [];
      return headers.map(function (_, i) {
        return arr[i];
      });
    });

    return { headers: headers, rows: rows };
  }

  function createOrReplaceTable(tableName, headers, rows) {
    if (!db) throw new Error("Database not ready.");

    if (!headers || !headers.length) {
      throw new Error("No columns found.");
    }

    var safeHeaders = headers.map(function (h, idx) {
      var s = makeSafeTableName(h || "col_" + (idx + 1));
      return s || "col_" + (idx + 1);
    });

    var perColValues = safeHeaders.map(function (_, colIdx) {
      return rows.map(function (row) {
        return row[colIdx];
      });
    });

    var colDefs = safeHeaders.map(function (col, idx) {
      return quoteIdent(col) + " " + inferColumnType(perColValues[idx]);
    });

    db.run("DROP TABLE IF EXISTS " + quoteIdent(tableName) + ";");
    db.run(
      "CREATE TABLE " +
        quoteIdent(tableName) +
        " (" +
        colDefs.join(", ") +
        ");"
    );

    if (!rows.length) return;

    var placeholders = safeHeaders.map(function () {
      return "?";
    });
    var insertSql =
      "INSERT INTO " +
      quoteIdent(tableName) +
      " (" +
      safeHeaders.map(quoteIdent).join(", ") +
      ") VALUES (" +
      placeholders.join(", ") +
      ");";

    var stmt = db.prepare(insertSql);
    try {
      rows.forEach(function (row) {
        var vals = safeHeaders.map(function (_, i) {
          return normalizeCell(row[i]);
        });
        stmt.run(vals);
      });
    } finally {
      stmt.free();
    }
  }

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var cell = "";
    var i = 0;
    var inQuotes = false;

    while (i < text.length) {
      var ch = text[i];
      var next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        if (ch === '"') {
          inQuotes = false;
          i++;
          continue;
        }
        cell += ch;
        i++;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (ch === ",") {
        row.push(cell);
        cell = "";
        i++;
        continue;
      }

      if (ch === "\r") {
        i++;
        continue;
      }

      if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        i++;
        continue;
      }

      cell += ch;
      i++;
    }

    row.push(cell);
    if (!(row.length === 1 && row[0] === "" && rows.length > 0)) {
      rows.push(row);
    }

    rows = rows.filter(function (r) {
      return !(r.length === 1 && String(r[0]).trim() === "");
    });

    if (!rows.length) throw new Error("CSV is empty.");

    var headers = rows[0].map(function (h, idx) {
      var raw = String(h || "").trim() || "col_" + (idx + 1);
      return makeSafeTableName(raw);
    });

    var dataRows = rows.slice(1).map(function (r) {
      return headers.map(function (_, i2) {
        return r[i2] === undefined ? null : r[i2];
      });
    });

    return { headers: headers, rows: dataRows };
  }

  function readTextFile(file, callback) {
    var reader = new FileReader();
    reader.onload = function () {
      callback(null, reader.result || "");
    };
    reader.onerror = function () {
      callback(new Error("Could not read file."));
    };
    reader.readAsText(file);
  }

  function loadCSVFileIntoDB(file) {
    if (!file) {
      showErr("Please choose a CSV file first.");
      return;
    }

    readTextFile(file, function (err, text) {
      if (err) {
        showErr(err.message);
        return;
      }

      try {
        var parsed = parseCSV(text);
        var tableName = getImportTableName(file.name);
        createOrReplaceTable(tableName, parsed.headers, parsed.rows);
        renderSchemaExplorer();
        sqlInput.value =
          "SELECT * FROM " + quoteIdent(tableName) + " LIMIT 100;";
        runSQL();
        showOk(
          "CSV loaded into table " +
            tableName +
            " (" +
            parsed.rows.length +
            " row(s)) ✅"
        );
      } catch (e) {
        showErr(
          "CSV import failed.\n\n" +
            (e && e.message ? e.message : String(e))
        );
      }
    });
  }

  function loadJSONFileIntoDB(file) {
    if (!file) {
      showErr("Please choose a JSON file first.");
      return;
    }

    readTextFile(file, function (err, text) {
      if (err) {
        showErr(err.message);
        return;
      }

      try {
        var parsedJson = JSON.parse(text);
        var spec;

        if (Array.isArray(parsedJson) && parsedJson.length) {
          if (
            parsedJson[0] &&
            typeof parsedJson[0] === "object" &&
            !Array.isArray(parsedJson[0])
          ) {
            spec = arrayOfObjectsToTableSpec(parsedJson);
          } else if (Array.isArray(parsedJson[0])) {
            spec = arrayOfArraysToTableSpec(parsedJson);
          } else {
            throw new Error(
              "JSON must be an array of objects or array of arrays."
            );
          }
        } else if (
          parsedJson &&
          typeof parsedJson === "object" &&
          Array.isArray(parsedJson.rows) &&
          Array.isArray(parsedJson.columns)
        ) {
          spec = {
            headers: parsedJson.columns,
            rows: parsedJson.rows,
          };
        } else {
          throw new Error(
            "JSON must be an array of objects, array of arrays, or {columns, rows}."
          );
        }

        var tableName = getImportTableName(file.name);
        createOrReplaceTable(tableName, spec.headers, spec.rows);
        renderSchemaExplorer();
        sqlInput.value =
          "SELECT * FROM " + quoteIdent(tableName) + " LIMIT 100;";
        runSQL();
        showOk(
          "JSON loaded into table " +
            tableName +
            " (" +
            spec.rows.length +
            " row(s)) ✅"
        );
      } catch (e) {
        showErr(
          "JSON import failed.\n\n" +
            (e && e.message ? e.message : String(e))
        );
      }
    });
  }

  function exportCurrentDB() {
    if (!db) return;
    try {
      var data = db.export();
      var blob = new Blob([data], {
        type: "application/x-sqlite3",
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "programmers-picnic.sqlite";
      a.click();
      URL.revokeObjectURL(url);
      showOk("Database exported ✅");
    } catch (e) {
      showErr(
        "DB export failed.\n\n" + (e && e.message ? e.message : String(e))
      );
    }
  }

  function loadSQLiteArrayBuffer(arrayBuffer) {
    if (!SQLlib) return;
    try {
      if (db) {
        try {
          db.close();
        } catch (e) {}
      }
      db = new SQLlib.Database(new Uint8Array(arrayBuffer));
      try {
        db.run("PRAGMA foreign_keys = ON;");
      } catch (e) {}

      lastSelectResult = null;
      downloadCsvBtn.disabled = true;
      downloadJsonBtn.disabled = true;
      copyCsvBtn.disabled = true;
      csvHint.textContent = "Run a SELECT";

      clearOutput();
      renderSchemaExplorer();
      showOk("Loaded SQLite DB file successfully ✅");
      renderHistory();
    } catch (e) {
      showErr(
        "Failed to open this file as a SQLite database.\n\n" +
          (e && e.message ? e.message : String(e))
      );
    }
  }

  function loadSelectedSQLiteFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var buf = reader.result;
      if (!buf) {
        showErr("Could not read file.");
        return;
      }
      loadSQLiteArrayBuffer(buf);
    };
    reader.onerror = function () {
      showErr("Failed to read file. Please try again.");
    };
    reader.readAsArrayBuffer(file);
  }

  function createFreshDB() {
    db = new SQLlib.Database();
    db.run("PRAGMA foreign_keys = ON;");

    db.run("DROP TABLE IF EXISTS stops;");
    db.run("DROP TABLE IF EXISTS trains;");
    db.run("DROP TABLE IF EXISTS Subscribers;");
    db.run("DROP TABLE IF EXISTS Publications;");
    db.run("DROP TABLE IF EXISTS Ticket;");
    db.run("DROP TABLE IF EXISTS Student;");
    db.run("DROP TABLE IF EXISTS Footballers;");
    db.run("DROP TABLE IF EXISTS Cricketers;");
    db.run("DROP TABLE IF EXISTS Cricket_Scores;");
    db.run("DROP TABLE IF EXISTS employees;");
    db.run("DROP TABLE IF EXISTS birthdays;");

    db.run(
      "CREATE TABLE birthdays (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, birthday TEXT NOT NULL);"
    );
    db.run(
      "INSERT INTO birthdays (name, birthday) VALUES ('Alice', '1998-07-14');"
    );
    db.run(
      "INSERT INTO birthdays (name, birthday) VALUES ('Bob', '1995-02-28');"
    );
    db.run(
      "INSERT INTO birthdays (name, birthday) VALUES ('Charlie', '2001-12-05');"
    );

    db.run(
      "CREATE TABLE employees (emp_id INTEGER PRIMARY KEY, emp_name TEXT NOT NULL, birthday_id INTEGER, FOREIGN KEY(birthday_id) REFERENCES birthdays(id));"
    );
    db.run(
      "INSERT INTO employees (emp_id, emp_name, birthday_id) VALUES (1, 'Riya', 1);"
    );
    db.run(
      "INSERT INTO employees (emp_id, emp_name, birthday_id) VALUES (2, 'Sahil', 2);"
    );
    db.run(
      "INSERT INTO employees (emp_id, emp_name, birthday_id) VALUES (3, 'Nisha', 3);"
    );

    db.run(`
      CREATE TABLE Student (
        RollNo INTEGER,
        Name TEXT,
        Age INTEGER,
        Course TEXT,
        PRIMARY KEY (RollNo, Course)
      );
    `);
    db.run(`
      INSERT INTO Student VALUES
        (1,'Himanshu',35,'MBBS'),
        (1,'Himanshu',34,'MD'),
        (2,'Ashish',22,'MBBS');
    `);

    db.run(`
      CREATE TABLE Ticket (
        TicketNo TEXT PRIMARY KEY,
        PNRNo TEXT UNIQUE,
        PassengerName TEXT,
        DateOfJourney TEXT,
        TrainNo TEXT,
        CoachNo TEXT,
        BerthNo INTEGER,
        UNIQUE(DateOfJourney,TrainNo,CoachNo,BerthNo)
      );
    `);
    db.run(
      `INSERT INTO Ticket VALUES ('T1','P1','Ashish','2023-01-01','123','S1',1);`
    );

    db.run(`
      CREATE TABLE Publications(
        PublicationName TEXT PRIMARY KEY
      );
    `);
    db.run(`
      INSERT INTO Publications VALUES
        ('Yuva Bharati'),
        ('Vivekananda Kendra Patrika');
    `);

    db.run(`
      CREATE TABLE Subscribers(
        PublicationName TEXT REFERENCES Publications(PublicationName),
        CustomerId TEXT,
        PRIMARY KEY(PublicationName,CustomerId)
      );
    `);
    db.run(`
      INSERT INTO Subscribers VALUES
        ('Yuva Bharati','Ashish'),
        ('Vivekananda Kendra Patrika','Manish');
    `);

    db.run(`
      CREATE TABLE Cricketers(
        name TEXT PRIMARY KEY,
        runs INTEGER
      );
    `);
    db.run(`INSERT INTO Cricketers VALUES ('A',100),('C',150);`);

    db.run(`
      CREATE TABLE Footballers(
        name TEXT PRIMARY KEY,
        goals INTEGER
      );
    `);
    db.run(`INSERT INTO Footballers VALUES ('B',15),('C',25);`);

    db.run(`
      CREATE TABLE Cricket_Scores(
        batsman TEXT,
        InningsNo INTEGER,
        MatchType TEXT,
        score INTEGER
      );
    `);
    db.run(`
      INSERT INTO Cricket_Scores VALUES
        ('Champak',1,'Test',111),
        ('Champak',1,'OneDay',112),
        ('Gaurav',1,'OneDay',0),
        ('Gaurav',2,'OneDay',10),
        ('Champak',2,'OneDay',113),
        ('Pappu',1,'OneDay',3),
        ('Pappu',2,'OneDay',2);
    `);

    db.run(`
      CREATE TABLE trains(
        TrainNo TEXT PRIMARY KEY,
        TrainName TEXT,
        Source TEXT,
        Dest TEXT
      );
    `);
    db.run(`
      CREATE TABLE stops(
        stopno INTEGER,
        trainno TEXT REFERENCES trains(TrainNo),
        station TEXT,
        PRIMARY KEY(stopno,trainno)
      );
    `);

    db.run(`
      INSERT INTO trains VALUES
        ('1','Mahanagari','Varanasi','Mumbai'),
        ('2','Mahanagari','Mumbai','Varanasi'),
        ('3','Ratnagiri','Varanasi','Mumbai');
    `);

    db.run(`
      INSERT INTO stops VALUES
        (1,'1','Varanasi'),
        (2,'1','Jabalpur'),
        (3,'1','Itarsi'),
        (4,'1','Jalgaon'),
        (5,'1','Mumbai');
    `);

    db.run(`
      INSERT INTO stops VALUES
        (1,'3','Varanasi'),
        (2,'3','Itarsi'),
        (3,'3','Jalgaon'),
        (4,'3','Mumbai');
    `);

    renderSchemaExplorer();
  }

  function setResultExportState(enabled) {
    downloadCsvBtn.disabled = !enabled;
    downloadJsonBtn.disabled = !enabled;
    copyCsvBtn.disabled = !enabled;
    csvHint.textContent = enabled ? "Ready" : "Run a SELECT";
  }

  function renderResultSets(resultSets) {
    if (!resultSets || !resultSets.length) {
      resultDiv.innerHTML =
        '<div class="muted small" style="padding:12px">No result set returned.</div>';
      return;
    }

    var html = "";

    for (var i = 0; i < resultSets.length; i++) {
      var rs = resultSets[i];
      var columns = rs.columns || [];
      var values = rs.values || [];

      html += '<div class="resultset-block">';
      if (resultSets.length > 1) {
        html +=
          '<div class="muted small" style="padding:10px 10px 0 10px;font-weight:900">Result Set ' +
          (i + 1) +
          " • " +
          values.length +
          " row(s)</div>";
      }

      html += "<table><thead><tr>";
      for (var c = 0; c < columns.length; c++) {
        html += "<th>" + escapeHtml(columns[c]) + "</th>";
      }
      html += "</tr></thead><tbody>";

      if (!values.length) {
        html +=
          '<tr><td colspan="' +
          Math.max(columns.length, 1) +
          '" class="muted small">No rows.</td></tr>';
      } else {
        for (var r = 0; r < values.length; r++) {
          html += "<tr>";
          for (var c2 = 0; c2 < columns.length; c2++) {
            var v = values[r][c2];
            html += "<td>" + escapeHtml(v === null ? "NULL" : v) + "</td>";
          }
          html += "</tr>";
        }
      }

      html += "</tbody></table></div>";
    }

    resultDiv.innerHTML = html;
  }

  function stripLeadingComments(sql) {
    var s = String(sql || "");

    while (true) {
      s = s.trimStart();

      if (s.startsWith("--")) {
        var nl = s.indexOf("\n");
        s = nl === -1 ? "" : s.slice(nl + 1);
        continue;
      }

      if (s.startsWith("/*")) {
        var end = s.indexOf("*/");
        s = end === -1 ? "" : s.slice(end + 2);
        continue;
      }

      break;
    }

    return s.trimStart();
  }

  function getFirstKeyword(sql) {
    var s = stripLeadingComments(sql).toLowerCase();
    var m = s.match(/^([a-z]+)/);
    return m ? m[1] : "";
  }

  function runSQL() {
    clearOutput();
    if (!db) return;

    var sql = sqlInput.value || "";
    var start = performance.now();

    try {
      var res = [];
      var hadResultSet = false;

      try {
        res = db.exec(sql);
        hadResultSet = Array.isArray(res) && res.length > 0;
      } catch (execErr) {
        res = null;
        hadResultSet = false;
      }

      if (hadResultSet) {
        renderResultSets(res);

        var last = res[res.length - 1];
        lastSelectResult = {
          columns: last.columns || [],
          values: last.values || [],
        };

        var rowCount = (last.values || []).length;
        metaRows.textContent = rowCount + " row(s)";
        if (metaRowsInline) metaRowsInline.textContent = rowCount + " row(s)";

        setResultExportState(true);

        var ms1 = Math.round(performance.now() - start);
        showExecutionSummary(true, "Query executed successfully.", ms1);
        flashResultState("success");
        saveHistory("success", sql, ms1);
        renderHistory();
        renderSchemaExplorer();
        return;
      }

      db.run(sql);

      lastSelectResult = null;
      setResultExportState(false);
      metaRows.textContent = "";
      if (metaRowsInline) metaRowsInline.textContent = "";

      resultDiv.innerHTML =
        '<div class="muted small" style="padding:12px">Statement executed. No result rows returned.</div>';

      var ms2 = Math.round(performance.now() - start);
      showExecutionSummary(true, "Statement executed.", ms2);
      flashResultState("success");
      saveHistory("success", sql, ms2);
      renderHistory();
      renderSchemaExplorer();
    } catch (e) {
      showErr(e && e.message ? e.message : String(e));
      flashResultState("error");
      saveHistory("fail", sql, 0, e && e.message ? e.message : String(e));
      renderHistory();
    }
  }

  function saveHistory(kind, sql, ms, err) {
    var key = kind === "success" ? LS_SUCCESS : LS_FAIL;
    var arr = readLS(key);
    arr.unshift({ ts: nowISO(), sql: sql, ms: ms || 0, err: err || "" });
    if (arr.length > 80) arr = arr.slice(0, 80);
    writeLS(key, arr);
  }

  function setTab(tab) {
    activeTab = tab;
    tabSuccess.classList.toggle("on", tab === "success");
    tabFail.classList.toggle("on", tab === "fail");
    tabSuccess.setAttribute("aria-selected", String(tab === "success"));
    tabFail.setAttribute("aria-selected", String(tab === "fail"));
    renderHistory();
  }

  function renderHistory() {
    var key = activeTab === "success" ? LS_SUCCESS : LS_FAIL;
    var arr = readLS(key);
    histCount.textContent = arr.length + " item(s)";
    historyList.innerHTML = "";

    if (!arr.length) {
      historyList.innerHTML =
        '<div class="histitem"><div class="muted small">No history yet.</div></div>';
      return;
    }

    arr.forEach(function (it, idx) {
      var wrap = document.createElement("div");
      wrap.className = "histitem";
      wrap.innerHTML =
        '<div class="hmeta"><span>' +
        escapeHtml(it.ts) +
        "</span>" +
        "<span>" +
        (activeTab === "success" ? escapeHtml(it.ms + " ms") : "Failed") +
        "</span></div>" +
        "<pre>" +
        escapeHtml(it.sql) +
        "</pre>" +
        (it.err
          ? '<div class="muted small" style="margin-top:8px"><span class="danger">Error:</span> ' +
            escapeHtml(it.err) +
            "</div>"
          : "") +
        '<div class="actions">' +
        '<button data-act="insert" data-idx="' +
        idx +
        '" type="button">Insert</button>' +
        '<button data-act="copy" data-idx="' +
        idx +
        '" type="button">Copy</button>' +
        "</div>";

      historyList.appendChild(wrap);
    });
  }

  function exportHistory() {
    var payload = { success: readLS(LS_SUCCESS), fail: readLS(LS_FAIL) };
    var blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "sql_history.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function sanitizeHistoryArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(function (it) {
        return it && typeof it.sql === "string";
      })
      .slice(0, 200)
      .map(function (it) {
        return {
          ts: typeof it.ts === "string" ? it.ts : nowISO(),
          sql: typeof it.sql === "string" ? it.sql : "",
          ms: Number.isFinite(it.ms) ? it.ms : 0,
          err: typeof it.err === "string" ? it.err : "",
        };
      });
  }

  function importHistoryFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var payload = JSON.parse(reader.result || "{}");
        var successArr = sanitizeHistoryArray(payload.success);
        var failArr = sanitizeHistoryArray(payload.fail);

        writeLS(LS_SUCCESS, successArr);
        writeLS(LS_FAIL, failArr);

        showOk("History imported ✅");
        renderHistory();
      } catch (e) {
        showErr(
          "Import failed: " + (e && e.message ? e.message : String(e))
        );
      }
    };
    reader.readAsText(file);
  }

  function clearHistory() {
    writeLS(LS_SUCCESS, []);
    writeLS(LS_FAIL, []);
    showOk("History cleared.");
    renderHistory();
  }

  function toCSV(columns, values) {
    function csvCell(v) {
      if (v === null || v === undefined) return "";
      var s = String(v);
      if (/[",\n]/.test(s)) s = '"' + s.replaceAll('"', '""') + '"';
      return s;
    }

    var lines = [];
    lines.push(columns.map(csvCell).join(","));
    (values || []).forEach(function (row) {
      lines.push(row.map(csvCell).join(","));
    });
    return lines.join("\n");
  }

  function toResultObjects(columns, values) {
    return (values || []).map(function (row) {
      var obj = {};
      columns.forEach(function (col, idx) {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  function downloadCSV() {
    if (!lastSelectResult) return;
    var csv = toCSV(lastSelectResult.columns, lastSelectResult.values);
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJSON() {
    if (!lastSelectResult) return;
    var rows = toResultObjects(
      lastSelectResult.columns,
      lastSelectResult.values
    );
    var blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "result.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyCSV() {
    if (!lastSelectResult) return;
    var csv = toCSV(lastSelectResult.columns, lastSelectResult.values);
    navigator.clipboard
      .writeText(csv)
      .then(function () {
        showOk("CSV copied ✅");
      })
      .catch(function () {
        showErr("Clipboard blocked by browser.");
      });
  }

  function buildShareUrl() {
    var url = new URL(window.location.href);
    var sql = sqlInput.value || "";
    if (sql.trim()) {
      url.hash = "sql=" + encodeURIComponent(sql);
    } else {
      url.hash = "";
    }
    return url.toString();
  }

  function shareCurrentSQL() {
    var shareUrl = buildShareUrl();
    var sql = sqlInput.value || "";
    var shareText =
      "Try this SQL in Programmer’s Picnic — SQL in Browser:\n\n" + sql;

    if (navigator.share) {
      navigator
        .share({
          title: "Programmer’s Picnic — SQL in Browser",
          text: shareText,
          url: shareUrl,
        })
        .then(function () {
          showOk("Shared ✅");
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;
          navigator.clipboard
            .writeText(shareUrl)
            .then(function () {
              showOk("Share link copied ✅");
            })
            .catch(function () {
              showErr("Sharing and clipboard both failed.");
            });
        });
      return;
    }

    navigator.clipboard
      .writeText(shareUrl)
      .then(function () {
        showOk("Share link copied ✅");
      })
      .catch(function () {
        showErr("Clipboard blocked by browser.");
      });
  }

  function loadSQLFromHash() {
    var hash = window.location.hash || "";
    if (!hash.startsWith("#sql=")) return;
    try {
      var encoded = hash.slice(5);
      var decoded = decodeURIComponent(encoded);
      if (decoded.trim()) {
        sqlInput.value = decoded;
        showInfo("Loaded shared SQL from link.");
      }
    } catch (e) {
      showErr("Could not read shared SQL from URL.");
    }
  }

  function renderSchemaExplorer() {
    if (!db || !schemaList) {
      if (schemaList) schemaList.innerHTML = "";
      return;
    }

    try {
      var res = db.exec(
        "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name;"
      );

      if (!res || !res.length || !res[0].values.length) {
        schemaList.innerHTML =
          '<div class="muted small">No tables found.</div>';
        return;
      }

      var values = res[0].values;
      schemaList.innerHTML = values
        .map(function (row) {
          var name = String(row[0] || "");
          var type = String(row[1] || "");
          var selectSql = "SELECT * FROM " + quoteIdent(name) + ";";
          var describeSql =
            "PRAGMA table_info(" + quoteIdent(name) + ");";

          return (
            '<div class="helpitem">' +
            "<b>" +
            escapeHtml(name) +
            "</b>" +
            '<div class="muted small" style="margin-top:6px">' +
            escapeHtml(type) +
            "</div>" +
            '<div class="row" style="margin-top:8px">' +
            '<button class="btn-ghost schema-btn" type="button" data-sql="' +
            escapeHtml(selectSql) +
            '">SELECT *</button>' +
            '<button class="btn-ghost schema-btn" type="button" data-sql="' +
            escapeHtml(describeSql) +
            '">Describe</button>' +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    } catch (e) {
      schemaList.innerHTML =
        '<div class="muted small">Could not load schema.</div>';
    }
  }

  var HELP = [
    { k: "select", d: "Retrieve rows: SELECT col FROM table WHERE ... ORDER BY ... LIMIT ..." },
    { k: "where", d: "Filter rows: WHERE condition (e.g., age > 18 AND city='Delhi')" },
    { k: "join", d: "Combine tables: INNER JOIN / LEFT JOIN using ON t1.id=t2.ref (SQLite: no native RIGHT/FULL join; emulate with LEFT JOIN + UNION)." },
    { k: "inner join", d: "Only matching rows from both tables." },
    { k: "left join", d: "All rows from left table + matching rows from right table." },
    { k: "right join", d: "Not native in SQLite; emulate by swapping tables in a LEFT JOIN." },
    { k: "full join", d: "Not native in SQLite; emulate with (A LEFT JOIN B) UNION (B LEFT JOIN A)." },
    { k: "group by", d: "Aggregate rows: GROUP BY col with COUNT/SUM/AVG/MAX/MIN" },
    { k: "having", d: "Filter groups (aggregate conditions): HAVING MAX(score) >= 100" },
    { k: "order by", d: "Sort rows: ORDER BY col ASC|DESC" },
    { k: "limit", d: "Limit output rows: LIMIT 10 OFFSET 20" },
    { k: "pragma", d: "SQLite settings & introspection: PRAGMA table_info(tbl); PRAGMA foreign_keys;" },
    { k: "primary key", d: "Primary key uniquely identifies a row. Composite PK can be (col1, col2)." },
    { k: "unique", d: "UNIQUE enforces that values (or combinations) cannot repeat (candidate key idea)." },
    { k: "foreign key", d: "FOREIGN KEY ensures child rows reference an existing parent row (referential integrity)." },
    { k: "union", d: "UNION combines rows from two SELECTs and removes duplicates." },
    { k: "union all", d: "UNION ALL combines rows and keeps duplicates." },
    { k: "intersect", d: "INTERSECT returns rows common to both SELECTs." },
    { k: "except", d: "EXCEPT returns rows in first SELECT not present in second (Oracle MINUS)." },
    { k: "aggregate", d: "Aggregate functions operate on many rows: MAX, MIN, SUM, AVG, COUNT." },
    { k: "max", d: "MAX(column) returns largest value in the group/result." },
    { k: "min", d: "MIN(column) returns smallest value in the group/result." },
    { k: "sum", d: "SUM(column) totals numeric values." },
    { k: "avg", d: "AVG(column) returns average of numeric values." },
    { k: "count", d: "COUNT(*) or COUNT(col) counts rows/non-null values." },
    { k: "sqlite_master", d: "System catalog: SELECT name,type,sql FROM sqlite_master WHERE type='table';" }
  ];

  function renderHelp(q) {
    var query = (q || "").trim().toLowerCase();
    var items = HELP.filter(function (it) {
      return (
        !query ||
        it.k.includes(query) ||
        it.d.toLowerCase().includes(query)
      );
    }).slice(0, 12);

    helpResults.innerHTML =
      items
        .map(function (it) {
          return (
            '<div class="helpitem"><b>' +
            escapeHtml(it.k) +
            "</b><div class='muted small' style='margin-top:6px'>" +
            escapeHtml(it.d) +
            "</div></div>"
          );
        })
        .join("") || '<div class="muted small">No matches.</div>';
  }

  document.querySelectorAll("[data-sql]").forEach(function (b) {
    b.addEventListener("click", function () {
      sqlInput.value = b.getAttribute("data-sql") || "";
      sqlInput.focus();
    });
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".schema-btn");
    if (!btn) return;
    sqlInput.value = btn.getAttribute("data-sql") || "";
    sqlInput.focus();
  });

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", function () {
      var isDark = document.body.classList.contains("theme-dark");
      applyTheme(isDark ? "light" : "dark");
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      shareCurrentSQL();
    });
  }

  if (shareSqlBtn) {
    shareSqlBtn.addEventListener("click", function () {
      shareCurrentSQL();
    });
  }

  if (activityRunBtn) {
    activityRunBtn.addEventListener("click", function () {
      if (!runBtn.disabled) runSQL();
    });
  }

  if (activityHistoryBtn) {
    activityHistoryBtn.addEventListener("click", function () {
      setTab("success");
      historyList.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (activityHelpBtn) {
    activityHelpBtn.addEventListener("click", function () {
      var show = helpBox.style.display === "none";
      helpBox.style.display = show ? "block" : "none";
      if (show) renderHelp(helpSearch.value);
      if (show) {
        helpBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  }

  runBtn.onclick = runSQL;

  resetBtn.onclick = function () {
    if (
      !confirm("Reset the current database and recreate the sample tables?")
    ) {
      return;
    }

    clearOutput();
    if (!db) return;
    try {
      db.close();
    } catch (e) {}
    createFreshDB();
    lastSelectResult = null;
    setResultExportState(false);
    renderSchemaExplorer();
    showOk("Database reset (tables + sample rows recreated).");
  };

  loadDbBtn.onclick = function () {
    clearOutput();
    if (!SQLlib) return;
    var file =
      sqliteFile && sqliteFile.files ? sqliteFile.files[0] : null;
    if (!file) {
      showErr("Please choose a .db/.sqlite file first.");
      return;
    }
    showInfo("Loading DB file: " + file.name + " …");
    loadSelectedSQLiteFile(file);
  };

  useSampleBtn.onclick = function () {
    clearOutput();
    if (!SQLlib) return;
    try {
      if (db) {
        try {
          db.close();
        } catch (e) {}
      }
      createFreshDB();
      lastSelectResult = null;
      setResultExportState(false);
      renderSchemaExplorer();
      showOk("Switched back to Sample DB ✅");
      runSQL();
    } catch (e) {
      showErr(
        "Failed to restore sample DB.\n\n" +
          (e && e.message ? e.message : String(e))
      );
    }
  };

  loadCsvBtn.onclick = function () {
    if (!db) return;
    var file = dataFile && dataFile.files ? dataFile.files[0] : null;
    if (!file) {
      showErr("Please choose a CSV file first.");
      return;
    }
    loadCSVFileIntoDB(file);
  };

  loadJsonBtn.onclick = function () {
    if (!db) return;
    var file = dataFile && dataFile.files ? dataFile.files[0] : null;
    if (!file) {
      showErr("Please choose a JSON file first.");
      return;
    }
    loadJSONFileIntoDB(file);
  };

  exportDbBtn.onclick = exportCurrentDB;

  copySqlBtn.onclick = function () {
    navigator.clipboard
      .writeText(sqlInput.value || "")
      .then(function () {
        showOk("SQL copied ✅");
      })
      .catch(function () {
        showErr("Clipboard blocked by browser.");
      });
  };

  downloadCsvBtn.onclick = downloadCSV;
  downloadJsonBtn.onclick = downloadJSON;
  copyCsvBtn.onclick = copyCSV;

  tabSuccess.onclick = function () {
    setTab("success");
  };

  tabFail.onclick = function () {
    setTab("fail");
  };

  historyList.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    var idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
    var arr = readLS(activeTab === "success" ? LS_SUCCESS : LS_FAIL);
    var item = arr[idx];
    if (!item) return;

    if (act === "insert") {
      sqlInput.value = item.sql || "";
      sqlInput.focus();
    }

    if (act === "copy") {
      navigator.clipboard
        .writeText(item.sql || "")
        .then(function () {
          showOk("Copied ✅");
        })
        .catch(function () {
          showErr("Clipboard blocked by browser.");
        });
    }
  });

  exportHistoryBtn.onclick = exportHistory;
  importHistoryBtn.onclick = function () {
    importFile.click();
  };

  importFile.addEventListener("change", function () {
    var file = importFile.files && importFile.files[0];
    if (file) importHistoryFile(file);
    importFile.value = "";
  });

  clearHistoryBtn.onclick = function () {
    if (!confirm("Clear all saved SQL history on this device?")) return;
    clearHistory();
  };

  toggleHelpBtn.onclick = function () {
    var show = helpBox.style.display === "none";
    helpBox.style.display = show ? "block" : "none";
    if (show) renderHelp(helpSearch.value);
  };

  helpSearch.addEventListener("input", function () {
    renderHelp(helpSearch.value);
  });

  initTheme();
  setStatus(false);

  if (window.initSqlJs) {
    window
      .initSqlJs({
        locateFile: function (f) {
          return "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/" + f;
        },
      })
      .then(function (SQL) {
        SQLlib = SQL;
        createFreshDB();
        setStatus(true);
        loadSQLFromHash();
        renderSchemaExplorer();
        showOk("SQLite loaded. Sample DB created.");
        renderHistory();
        renderHelp("");
      })
      .catch(function (e) {
        showErr(
          "Failed to load sql.js\n\n" +
            (e && e.message ? e.message : String(e))
        );
        setStatus(false);
      });
  } else {
    showErr(
      "sql.js not available (initSqlJs missing). Check the script include."
    );
    setStatus(false);
  }

  sqlInput.addEventListener("keydown", function (ev) {
    var isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    if ((isMac ? ev.metaKey : ev.ctrlKey) && ev.key === "Enter") {
      ev.preventDefault();
      if (!runBtn.disabled) runSQL();
    }
  });
})();



document.addEventListener("click", function (e) {
  var btn = e.target.closest(".toggle-section-btn");
  if (!btn) return;

  var targetId = btn.getAttribute("data-target");
  var target = targetId ? document.getElementById(targetId) : null;
  if (!target) return;

  var willHide = !target.classList.contains("is-hidden");
  target.classList.toggle("is-hidden", willHide);
  btn.textContent = willHide ? "Show" : "Hide";
  btn.setAttribute("aria-expanded", String(!willHide));
});

