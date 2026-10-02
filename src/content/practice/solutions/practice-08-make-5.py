import numpy as np

rows = int(input())
columns = int(input())
seats = np.arange(1, rows * columns + 1).reshape(rows, columns)
print(seats.T)
