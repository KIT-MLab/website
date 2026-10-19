import numpy as np

v1 = int(input())
v2 = int(input())
v3 = int(input())
v4 = int(input())
v5 = int(input())
v6 = int(input())
flat = np.array([v1, v2, v3, v4, v5, v6])
table = flat.reshape(3, 2)
print(round(table[:, 1].mean(), 1))
