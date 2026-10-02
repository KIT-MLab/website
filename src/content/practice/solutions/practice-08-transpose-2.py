import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
counts = np.array(table)
target = np.array([int(input()), int(input()), int(input())])
print(counts - target)
