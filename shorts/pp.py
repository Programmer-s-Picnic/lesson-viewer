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