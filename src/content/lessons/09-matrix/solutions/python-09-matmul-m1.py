import numpy as np

scores = np.array([[80, 70, 90], [60, 50, 40]])
W = np.array([[0.3, 0.4, 0.5], [0.3, 0.2, 0.25], [0.4, 0.4, 0.25]])
result = scores @ W
print(result.shape)
