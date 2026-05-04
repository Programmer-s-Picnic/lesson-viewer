import matplotlib.pyplot as plt


def distance(x1, y1, x2, y2):
    return ((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2))**.5


a = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [0, 0], [0, 1]]
print(a)
means = [[], []]
givenmeans = [(2.5, 2.5), [7.5, 7.5]]
cx0, cy0 = givenmeans[0]
cx1, cy1 = givenmeans[1]
for data in a:
    d0 = distance(cx0, cy0, data[0], data[1])
    d1 = distance(cx1, cy1, data[0], data[1])
    if d0 <= d1:
        means[0].append(data)
    else:
        means[1].append(data)

print(means)
x0, x1, y0, y1 = [], [], [], []
for data in means[0]:
    x0.append(data[0])
    y0.append(data[1])
for data in means[1]:
    x1.append(data[0])
    y1.append(data[1])

plt.plot(x0, y0)
plt.plot(x1, y1)
plt.scatter(x0, y0)
plt.scatter(x1, y1)
plt.show()
