import re


def split_sentences(text: str):
    """Very simple sentence splitter (., ?, !)."""
    parts = re.split(r"[.!?]+", text)
    return [p.strip() for p in parts if p.strip()]


text = "Hello! NLP is fun. Do you like it? Great."
print("Input:", text)
print("Sentences:", split_sentences(text))
