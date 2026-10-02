import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
sales = np.array(table)
print(sales.sum(axis=1))
print(sales.min(axis=0))
