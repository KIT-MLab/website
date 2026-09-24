import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
W = np.array([[0.3, 0.4], [0.3, 0.2], [0.4, 0.4]])
result = scores @ W
print(result)
print(result.shape)
