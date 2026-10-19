import numpy as np

a1 = int(input())
a2 = int(input())
a3 = int(input())
b1 = int(input())
b2 = int(input())
b3 = int(input())
a = np.array([a1, a2, a3])
b = np.array([b1, b2, b3])
print(round(np.sqrt(np.sum((a - b) ** 2)), 1))
