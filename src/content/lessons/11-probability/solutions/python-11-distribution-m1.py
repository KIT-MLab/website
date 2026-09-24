import numpy as np

scores = np.array([5, 3, 2])
total = np.sum(scores)
dist = scores / total
print(dist)
print(round(np.sum(dist), 1))
