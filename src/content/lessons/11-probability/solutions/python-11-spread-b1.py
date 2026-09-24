import numpy as np

n = int(input())
flat = []
for i in range(n * 3):
    flat.append(int(input()))
scores = np.array(flat).reshape(n, 3)
print(np.round(scores.std(axis=0), 1))
