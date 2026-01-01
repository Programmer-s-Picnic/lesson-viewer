class Person:
    def __init__(self,pn,a,h):
        self.name=pn
        self.age=a 
        self.height=h
    def __str__(self):
        return f"Name: {self.name}, Age: {self.age}, Height: {self.height}"

p1=Person("MS Dhoni",40,78)
print(p1)
