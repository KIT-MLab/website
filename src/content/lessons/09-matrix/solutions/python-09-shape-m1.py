import numpy as np

scores = np.array([[80, 70, 90], [60, 50, 40]])
weights = np.array([[0.3, 0.3, 0.4], [0.4, 0.2, 0.4], [0.5, 0.25, 0.25]])
print((scores @ weights.T).shape)
