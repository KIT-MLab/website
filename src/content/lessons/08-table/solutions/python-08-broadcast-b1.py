import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
diffs = np.round(scores - scores.mean(axis=0), 1)
print(diffs)
