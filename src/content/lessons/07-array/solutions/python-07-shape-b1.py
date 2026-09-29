import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
print(scores.shape)
print(scores[1] - scores[0])
