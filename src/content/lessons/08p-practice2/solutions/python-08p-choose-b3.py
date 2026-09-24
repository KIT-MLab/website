import numpy as np

def to_percent(table):
    return np.round(table / table.max(axis=0) * 100, 1)

n = int(input())
flat = []
for i in range(n * 3):
    flat.append(int(input()))
table = np.array(flat).reshape(n, 3)
print(to_percent(table))
