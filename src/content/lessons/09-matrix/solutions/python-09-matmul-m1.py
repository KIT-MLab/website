import numpy as np

scores = np.array([[80, 70, 90], [60, 50, 40], [70, 70, 70]])
W = np.array([[0.3, 0.4], [0.3, 0.2], [0.4, 0.4]])
result = scores @ W
print(result.shape)
