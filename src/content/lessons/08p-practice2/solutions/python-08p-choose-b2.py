import numpy as np

m = int(input())
flat = []
for i in range(m * 3):
    flat.append(int(input()))
table = np.array(flat).reshape(m, 3)

for i in range(m):
    row = table[i, :]
    cheapest = 0
    if row[1] < row[cheapest]:
        cheapest = 1
    if row[2] < row[cheapest]:
        cheapest = 2
    diff = round(row.mean() - row[cheapest], 1)
    print(f"{i + 1}: 店{cheapest + 1} {diff}円安い")
