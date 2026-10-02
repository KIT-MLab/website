import numpy as np

n = int(input())
scores = []
for i in range(n):
    scores.append(int(input()))
scores = np.array(scores)

passed = (scores >= 60) * 1
print(passed)
print(round(passed.mean(), 2))
