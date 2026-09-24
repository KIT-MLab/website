import numpy as np

def exp_distribution(arr):
    positive = np.exp(arr)
    return positive / np.sum(positive)

n = int(input())
values = []
for i in range(n):
    values.append(int(input()))
scores = np.array(values)
dist = exp_distribution(scores)
print(np.round(dist, 3))
print(round(float(np.sum(dist)), 1))
