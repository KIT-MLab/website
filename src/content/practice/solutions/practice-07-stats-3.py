import numpy as np

pages = np.array([int(input()), int(input()), int(input()), int(input())])
total = pages.sum()
print(total)
print(300 - total)
