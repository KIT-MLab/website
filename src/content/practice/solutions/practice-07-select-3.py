import numpy as np

amounts = np.array([int(input()), int(input()), int(input()), int(input()), int(input())])
print(amounts[amounts >= 1000].sum())
