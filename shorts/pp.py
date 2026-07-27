import pandas as pd

students_data = {
    "student_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "name": ["Amit", "Ravi", "Sita", "Meena", "Kabir", "Anu", "Farhan", "Pooja"],
    "city": ["Varanasi", "Lucknow", "Varanasi", "Delhi", "Lucknow", "Delhi", "Varanasi", "Lucknow"],
    "hours": [1, 2, 3, 4, 5, 6, 7, 8],
    "attendance": [55, 60, 65, 70, 78, 85, 90, 95],
    "marks": [35, 42, 50, 58, 70, 80, 88, 96]
}

df = pd.DataFrame(students_data)

print(df[["name","marks"]])
print(df[df["marks"] >= 70])
print(df.sort_values("marks", ascending=True))

import pandas as pd

students = pd.DataFrame({
    "student_id": [1, 2, 3],
    "name": ["Champak", "Saurabh", "Avinash"]
})

marks = pd.DataFrame({
    "student_id": [1, 2, 3],
    "marks": [78, 92, 65]
})

result = pd.merge(students, marks, on="student_id")

print(result)

result = pd.merge(students, marks, left_on="student_id",right_on="student_id")

print(result)