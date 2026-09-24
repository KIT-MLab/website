import numpy as np

d = int(input())
flat = []
for i in range(d * 4):
    flat.append(int(input()))
table = np.array(flat).reshape(d, 4)

for i in range(d):
    row = table[i, :]
    count = len(row[row >= 30])
    print(f"{i + 1}日目 {count}回")
