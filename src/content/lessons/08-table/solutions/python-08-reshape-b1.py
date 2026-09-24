import numpy as np

count = int(input())
flat = []
for i in range(count * 3):
    flat.append(int(input()))
table = np.array(flat).reshape(count, 3)
print(table.shape)
print(table)
