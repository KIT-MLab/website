import numpy as np

scores = np.array([int(input()), int(input()), int(input()), int(input()), int(input())])
low = scores[scores < 60]
print(60 - low)
