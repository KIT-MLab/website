import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
print(scores.mean(axis=0))
print(scores.max(axis=1))
