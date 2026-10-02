import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
scores = np.array(table)
w = np.array([0.25, 0.25, 0.5])
result = scores @ w
print(result)
print(result.shape)
