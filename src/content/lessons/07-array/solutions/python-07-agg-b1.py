import numpy as np

predicted = np.array([int(input()), int(input()), int(input())])
actual = np.array([int(input()), int(input()), int(input())])
squared = (predicted - actual) ** 2
print(squared.sum())
