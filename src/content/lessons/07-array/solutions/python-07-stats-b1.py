import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
print(np.round(scores.mean(axis=0), 1))
print(np.round(scores.mean(axis=1), 1))
