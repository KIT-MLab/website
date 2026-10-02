import numpy as np

a = np.array([int(input()), int(input()), int(input())])
b = np.array([int(input()), int(input()), int(input())])
print(round(np.sqrt(np.sum((a - b) ** 2)), 1))
