import numpy as np

a = np.array([int(input()), int(input()), int(input())])
w = np.array([0.3, 0.3, 0.4])
print(round(float(a @ w), 1))
