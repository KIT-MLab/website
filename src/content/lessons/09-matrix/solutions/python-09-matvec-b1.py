import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
w = np.array([0.3, 0.3, 0.4])
result = scores @ w
print(result)
print(result.shape)
