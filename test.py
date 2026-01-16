a = [
    [1, 2, 23],
    [4, 5, 6],
    [7, 8, 9]
]
leftdiagonalsum = 0
rightdiagonalsum = 0
n = len(a)
for i in range(n):
    leftdiagonalsum += a[i][i]
    rightdiagonalsum += a[n-1-i][i]

print(leftdiagonalsum, rightdiagonalsum)
