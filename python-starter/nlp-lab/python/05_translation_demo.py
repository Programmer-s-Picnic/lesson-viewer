import re

EN_HI = {
    "nlp": "एनएलपी",
    "helps": "मदद",
    "help": "मदद",
    "students": "छात्रों",
    "student": "छात्र",
    "learn": "सीखना",
    "language": "भाषा",
    "faster": "तेजी",
    "today": "आज",
    "important": "महत्वपूर्ण",
}

HI_EN = {v: k for k, v in EN_HI.items()}
HI_EN.update({"मदद": "help"})  # small improvement


def tokenize_en(s: str):
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.split() if s else []


def tokenize_hi(s: str):
    s = re.sub(r"[^\u0900-\u097F0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.split() if s else []


def en_to_hi_demo(s: str) -> str:
    return " ".join(EN_HI.get(w, w) for w in tokenize_en(s))


def hi_to_en_demo(s: str) -> str:
    return " ".join(HI_EN.get(w, w) for w in tokenize_hi(s))


en = "NLP helps students learn language faster."
hi = en_to_hi_demo(en)
back = hi_to_en_demo(hi)

print("EN  :", en)
print("HI  :", hi)
print("BACK:", back)
