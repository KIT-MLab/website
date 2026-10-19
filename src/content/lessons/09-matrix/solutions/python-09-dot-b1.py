import numpy as np

a1 = int(input())
a2 = int(input())
a3 = int(input())
a = np.array([a1, a2, a3])
w = np.array([0.2, 0.5, 0.3])
print(round(a @ w, 1))
