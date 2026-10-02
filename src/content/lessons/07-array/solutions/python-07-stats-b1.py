import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
scores = np.array(table)
print(scores.mean(axis=0))
print(scores.max(axis=1))
