import numpy as np

table = []
for i in range(2):
    row = []
    for j in range(3):
        row.append(int(input()))
    table.append(row)
a = np.array(table)

result = []
for j in range(3):
    new_row = []
    for i in range(2):
        new_row.append(a[i][j])
    result.append(new_row)
print(np.array(result))
