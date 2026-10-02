import numpy as np

n = int(input())
flat = []
for i in range(n * 3):
    flat.append(int(input()))
table = np.array(flat).reshape(n, 3)
totals = table.sum(axis=1)

best = 0
best_total = totals[0]
for i in range(n):
    if totals[i] > best_total:
        best_total = totals[i]
        best = i
print(f"いちばん歩いたのは {best + 1}人目 {best_total}歩")
