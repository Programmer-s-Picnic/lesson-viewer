import re


def tokenize_words(text: str):
    """Lowercase + remove punctuation + split into words."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.split() if text else []


s = "NLP helps computers understand human language!"
print("Input:", s)
print("Tokens:", tokenize_words(s))
