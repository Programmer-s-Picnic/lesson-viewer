# NLP Lab (VS Code Friendly)

## 1) Run the WEB demo (HTML/CSS/JS)
### Option A: VS Code Live Server (recommended)
1. Open folder `nlp-lab/` in VS Code
2. Install extension: **Live Server**
3. Open `web/index.html`
4. Right click → **Open with Live Server**

### Option B: Simple Python server (no extensions)
Open terminal in `nlp-lab/web` and run:
- **Windows**:
  ```bash
  py -m http.server 5500
  ```
- **Mac/Linux**:
  ```bash
  python3 -m http.server 5500
  ```

Then open:
`http://localhost:5500`

> Charts load via CDN (internet recommended). If offline, the rest still works.

---

## 2) Run Python examples (students)
Open terminal in `nlp-lab/python`

### Create venv + install
- **Windows**:
  ```bash
  py -m venv .venv
  .venv\Scripts\activate
  ```
- **Mac/Linux**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

Install:
```bash
pip install -r requirements.txt
```

### Run scripts
```bash
python 00_quick_test.py
python 01_words_tokenize.py
python 02_sentences_split.py
python 03_stopwords.py
python 04_syn_ant_demo.py
python 05_translation_demo.py
python 06_cosine_similarity.py
```

---

## Optional: Embed Pyodide editor
The web page embeds:
https://www.learnwithchampak.live/2026/01/programmers-picnic-python-editor.html

Works only when internet is available.
