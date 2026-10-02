import numpy as np

weeks = int(input())
values = []
for i in range(weeks * 5):
    values.append(int(input()))
visitors = np.array(values).reshape(weeks, 5)
print(visitors.sum(axis=0))
