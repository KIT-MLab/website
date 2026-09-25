import numpy as np

n = int(input())
flat = []
for i in range(3 * n):
    flat.append(int(input()))
table = np.array(flat).reshape(n, 3)


def pass_count(table, border=60):
    return (table >= border).sum(axis=0)


print(pass_count(table))
print(pass_count(table, 70))
