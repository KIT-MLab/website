import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
sales = np.array(table)
print(sales[0] + sales[1])
print(sales[1][2])
