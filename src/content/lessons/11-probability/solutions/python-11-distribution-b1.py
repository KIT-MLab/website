import numpy as np

def distribution(arr):
    total = np.sum(arr)
    return arr / total

n = int(input())
values = []
for i in range(n):
    values.append(int(input()))
scores = np.array(values)
dist = distribution(scores)
print(np.round(dist, 2))
print(round(float(np.sum(dist)), 1))
