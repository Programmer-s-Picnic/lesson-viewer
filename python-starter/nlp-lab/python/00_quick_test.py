import nltk
from sklearn.feature_extraction.text import TfidfVectorizer

print("NLTK version:", nltk.__version__)
print("TF-IDF available:", TfidfVectorizer is not None)
print("✅ Setup OK")
