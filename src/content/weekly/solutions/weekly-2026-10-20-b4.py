import numpy as np

n = int(input())
flat = []
for i in range(2 * n):
    flat.append(int(input()))
table = np.array(flat).reshape(n, 2)


def improvement(table):
    return table[:, 1] - table[:, 0]


diff = improvement(table)
print(diff)
print((diff > 0).sum())
