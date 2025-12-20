import re, math
from collections import Counter

def tokenize(text: str):
    """
    Token = a cleaned word.
    We keep letters+numbers. (Simple tokenizer)
    """
    text = text.lower()
    text = re.sub(r"[^a-z0-9\\s\\u0900-\\u097F]", " ", text)  # keep English + Devanagari
    tokens = [t for t in text.split() if t]
    return tokens

def make_vocab(tokens1, tokens2):
    "Vocabulary = sorted unique tokens across both sentences."
    return sorted(set(tokens1) | set(tokens2))

def vectorize(tokens, vocab):
    """
    Count Vector:
    For each word in vocab, store its count in the sentence.
    """
    c = Counter(tokens)
    return [c[w] for w in vocab]

def dot(a, b):
    return sum(x*y for x, y in zip(a, b))

def magnitude(v):
    return math.sqrt(sum(x*x for x in v))

def cosine_similarity(a, b):
    denom = (magnitude(a) * magnitude(b))
    if denom == 0:
        return 0.0
    return dot(a, b) / denom

S1="Piyush kidnapped Avinash"
S2="Avinash was kidnapped by Piyush"
t1 = tokenize(S1)
t2 = tokenize(S2)
vocab = make_vocab(t1, t2)
A = vectorize(t1, vocab)
B = vectorize(t2, vocab)
score = cosine_similarity(A, B)

label = ("✅ Very similar" if score > 0.8 else
         "🙂 Moderately similar" if score > 0.5 else
         "😕 Not similar")

report = []
report.append("STEP 1) Tokens")
report.append(f"  S1 tokens: {t1}")
report.append(f"  S2 tokens: {t2}\\n")

report.append("STEP 2) Vocabulary (unique words)")
report.append(f"  V = {vocab}\\n")

report.append("STEP 3) Count vectors (aligned to V)")
report.append(f"  A = {A}")
report.append(f"  B = {B}\\n")

report.append("STEP 4) Dot product and magnitudes")
report.append(f"  A·B = {dot(A,B)}")
report.append(f"  ||A|| = {magnitude(A):.4f}")
report.append(f"  ||B|| = {magnitude(B):.4f}\\n")

report.append("STEP 5) Cosine Similarity")
report.append(f"  score = {score:.4f}  {label}")

print(report)