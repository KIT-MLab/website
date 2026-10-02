import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
scores = np.array(table)
W = np.array([[0.2, 0.5], [0.3, 0.3], [0.5, 0.2]])
result = scores @ W
print(result)
print(result.shape)
