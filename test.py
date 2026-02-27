import matplotlib.pyplot as plt
import pandas as pd
data = {
    'id': [1, 2, 3, 4, 5, 6],
    'name': ['Dhoni', 'Piyush', 'Gambhir', 'Piyush', 'Rahul', 'Piyush'],
    'age': [24, 27, 22, 32, 29, 35],
    'city': ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata'],
    'score': [88, 92, 85, 70, 90, 95]
}

df = pd.DataFrame(data)
# print(df)
# result = df[df['age'] > 25]
# print("Age>25\n", result)

# result = df.query('score > 85')[['name', 'score']]
# print('score > 85\n', result)

# query = input()
# result = df.query(query)[['name', 'score']]
# print('score > 85\n', result)

ages = df[["age"]]
# print(ages)
ids = df[["id"]]
# print(ids)
plt.plot(ids, ages)
plt.show()
