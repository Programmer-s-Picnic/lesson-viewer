def pascal(y, x):
    if x == 1:
        return 1
    if y == x:
        return 1
    return pascal(y-1, x-1) + pascal(y-1, x)


n = 5
for i in range(1, n+1):
    for j in range(1, n-i+1):
        print(" ", end="")
    for k in range(1, i+1):
        print(pascal(i, k), end=" ")
    print()

for i in range(n-1, 0,-1):
    for j in range(1, n-i+1):
        print(" ", end="")
    for k in range(1, i+1):
        print(pascal(i, k), end=" ")
    print()




print()

for i in range(n, 1,-1):
    for j in range(1, n-i+1):
        print(" ", end="")
    for k in range(1, i+1):
        print(pascal(i, k), end=" ")
    print()

for i in range(1, n+1):
    for j in range(1, n-i+1):
        print(" ", end="")
    for k in range(1, i+1):
        print(pascal(i, k), end=" ")
    print()
