import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
counts = np.array(table)
t1 = int(input())
t2 = int(input())
t3 = int(input())
target = np.array([t1, t2, t3])
print(counts - target)
