import numpy as np

k = int(input())
scores = np.array([int(input()), int(input()), int(input()), int(input()), int(input()), int(input())])
print(round(scores[:k].mean(), 1))
print(round(scores[k:].mean(), 1))
