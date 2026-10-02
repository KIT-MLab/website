import numpy as np

scores = np.array([[80, 70, 90], [60, 50, 40]])
table = []
table.append([float(input()), float(input()), float(input())])
table.append([float(input()), float(input()), float(input())])
weights = np.array(table)
result = scores @ weights.T
print(result)
print(result.shape)
