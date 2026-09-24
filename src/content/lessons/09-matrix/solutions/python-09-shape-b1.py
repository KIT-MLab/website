import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
weights = np.array([[0.3, 0.3, 0.4], [0.4, 0.2, 0.4]])
result = scores @ weights.T
print(result)
print(result.shape)
