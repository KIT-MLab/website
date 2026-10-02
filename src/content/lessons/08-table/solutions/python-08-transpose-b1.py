import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
scores = np.array(table)
transposed = scores.T
print(transposed.shape)
print(transposed)
