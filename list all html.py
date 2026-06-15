import os

BASE = "https://aiml.learnwithchampak.live"

for root, dirs, files in os.walk("."):
    for file in files:
        if file.endswith(".html"):
            path = os.path.join(root, file).replace("\\", "/")
            url = BASE + "/" + path.lstrip("./")
            print(url)