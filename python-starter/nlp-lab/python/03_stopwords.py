import re

STOP = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "to", "of", "in", "on", "at",
    "is", "are", "was", "were", "be", "been", "being", "this", "that", "these", "those",
    "i", "you", "he", "she", "we", "they", "me", "my", "your", "our", "their", "it",
}


def tokenize(text: str):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text.split() if text else []


def remove_stopwords(tokens):
    return [t for t in tokens if t not in STOP]


s = "NLP helps the students to learn the language faster."
t = tokenize(s)

print("Tokens (raw):", t)
print("Tokens (no stopwords):", remove_stopwords(t))
