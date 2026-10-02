import numpy as np

n = int(input())
values = []
for i in range(n):
    values.append(int(input()))
arr = np.array(values)

for i in range(n - 2):
    end = i + 3
    window = arr[i:end]
    print(round(window.mean(), 1))
