import numpy as np

flat = np.array([int(input()), int(input()), int(input()), int(input()), int(input()), int(input())])
table = flat.reshape(3, 2)
print(table.T)
