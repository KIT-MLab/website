import numpy as np

scores = np.array([[80, 70, 90], [60, 50, 40], [70, 70, 70], [90, 80, 85]])
w = np.array([0.3, 0.3, 0.4])
print((scores @ w).shape)
