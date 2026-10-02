import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
stock = np.array(table)
print(stock - stock[0])
