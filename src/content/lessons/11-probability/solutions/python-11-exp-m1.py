import numpy as np

print(round(np.exp(1), 3))

scores = np.array([0, 0, 0])
positive = np.exp(scores)
print(np.round(positive, 2))
print(np.round(positive / np.sum(positive), 3))
