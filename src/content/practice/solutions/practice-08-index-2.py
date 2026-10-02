import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
visitors = np.array(table)
slot = int(input())
print(visitors[:, slot])
