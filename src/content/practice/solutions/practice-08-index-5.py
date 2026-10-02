import numpy as np

days = int(input())
table = []
for i in range(days):
    table.append([int(input()), int(input()), int(input())])
rain = np.array(table)
point = int(input())
column = rain[:, point]
print(column[column > column.mean()])
