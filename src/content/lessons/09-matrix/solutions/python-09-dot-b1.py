import numpy as np

a = np.array([int(input()), int(input()), int(input())])
w = np.array([0.2, 0.5, 0.3])
print(round(a @ w, 1))
