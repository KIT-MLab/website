import numpy as np

def cross_entropy(p, y):
    return np.mean(-(y * np.log(p) + (1 - y) * np.log(1 - p)))

n = int(input())
p = []
y = []
for i in range(n):
    p.append(float(input()))
    y.append(float(input()))
p = np.array(p)
y = np.array(y)

print(round(cross_entropy(p, y), 4))
