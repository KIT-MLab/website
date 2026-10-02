import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
scores = np.array(table)
subject = int(input())
column = scores[:, subject]
print(column)
print(np.round(column.mean(), 1))
