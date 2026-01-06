import pickle


class Student:          # ❌ local class (often causes pickling problems)
    def __init__(self, name):
        self.name = name
    


def make_student():

    return Student("Ravi")


s = make_student()

# This may fail with: "Can't pickle local object ..."
with open("bad.pkl", "wb") as f:
    pickle.dump(s, f)

with open("bad.pkl", "rb") as f:
    x=pickle.load( f)
print(x.name)

