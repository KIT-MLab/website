import numpy as np

table = []
table.append([int(input()), int(input()), int(input())])
table.append([int(input()), int(input()), int(input())])
parking = np.array(table)
floor = int(input())
area = int(input())
print(parking[floor, area])
