import numpy as np

table = []
table.append([int(input()), int(input())])
table.append([int(input()), int(input())])
table.append([int(input()), int(input())])
scores = np.array(table)
average = scores.mean(axis=1)
print((scores.T - average).T)
