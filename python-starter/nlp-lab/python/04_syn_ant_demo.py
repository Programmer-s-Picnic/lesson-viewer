THESAURUS = {
    "understand": {"syn": ["comprehend", "grasp"], "ant": ["misunderstand"]},
    "help": {"syn": ["assist", "support"], "ant": ["hinder", "harm"]},
    "important": {"syn": ["crucial", "vital"], "ant": ["minor", "unimportant"]},
    "happy": {"syn": ["joyful", "cheerful"], "ant": ["sad", "unhappy"]},
}


def synonyms_antonyms(word: str):
    w = word.lower().strip()
    return THESAURUS.get(w, {"syn": [], "ant": []})


for w in ["help", "understand", "unknown"]:
    d = synonyms_antonyms(w)
    print(f"\nWord: {w}")
    print("Synonyms:", d["syn"])
    print("Antonyms:", d["ant"])
