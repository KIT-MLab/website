import numpy as np

n = int(input())
values = []
for i in range(n):
    values.append(int(input()))
arr = np.array(values)

for i in range(n - 2):
    window = arr[i:i + 3]
    print(round(window.mean(), 1))
