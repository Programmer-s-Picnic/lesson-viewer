Teacher: index.html?tmode=1
Student: index.html?tmode=0
Share button enabled for students.
Note: If app.js is placeholder, ask to regenerate.

Packages:
- Teacher can toggle 'Allow Packages' (stored in localStorage).
- If allowed, Install works via micropip in worker.

Builder:
- Open builder.html to create problems/tests.
- Download JSON and host it on GitHub Pages.
- Load in editor: index.html?problems=YOUR_JSON_URL
- Builder can auto-generate expected outputs using Pyodide.


Code Loader:
- Load editor code from remote JSON: index.html?code=YOUR_CODE_JSON_URL
- JSON formats supported:
  - {"tabs":[{"name":"main.py","code":"..."}],"currentTab":0,"stdin":"...","problem":"sum_n"}
  - {"code":"print('hi')"}
  - [{"name":"main.py","code":"..."}, ...]

URL Params:
- problems=abc.json : load problems/tests JSON (absolute or relative URL)
- codefile=abc.py : load a raw .py file into editor as a tab
- code=abc.json   : load code JSON (tabs/stdin/problem)
Share:
- Share button copies a link to clipboard (keeps current query params + #hash state).

Packages (Options 1&2):
- Installs are persisted via IndexedDB (IDBFS) at /pp_persist when supported.
- Installed package names are shown in the Packages card.

Troubleshooting packages:
- If imports fail in Classroom Mode, ensure policy allows imports (Allow Packages + allow imports list).
- Persistence uses IndexedDB; some embedded iframes may block it.
