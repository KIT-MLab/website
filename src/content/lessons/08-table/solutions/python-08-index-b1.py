import numpy as np

scores = np.array([
    [int(input()), int(input()), int(input())],
    [int(input()), int(input()), int(input())],
])
subject = int(input())
column = scores[:, subject]
print(column)
print(np.round(column.mean(), 1))
