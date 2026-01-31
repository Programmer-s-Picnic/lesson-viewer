import re
import math
import numpy
STOP = {"a", "an", "the", "and", "or", "to", "of", "in", "on", "is", "are", "was", "were", "this", "that", "it"}


def tokenize(text: str):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    toks = text.split() if text else []
    return [w for w in toks if w not in STOP]


def vectorize(t1, t2):
    vocab = sorted(set(t1) | set(t2))
    v1 = [t1.count(w) for w in vocab]
    v2 = [t2.count(w) for w in vocab]
    return vocab, v1, v2


def cosine(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    n1 = math.sqrt(sum(a * a for a in v1))
    n2 = math.sqrt(sum(b * b for b in v2))
    return 0.0 if n1 == 0 or n2 == 0 else dot / (n1 * n2)


s1 = "NLP helps computers understand human language."
s2 = "Natural language processing helps machines understand people."

t1 = tokenize(s1)
t2 = tokenize(s2)
vocab, v1, v2 = vectorize(t1, t2)
score = cosine(v1, v2)

print("Tokens 1:", t1)
print("Tokens 2:", t2)
print("Vocab   :", vocab)
print("Vec 1   :", v1)
print("Vec 2   :", v2)
print("Cosine  :", round(score, 4))
