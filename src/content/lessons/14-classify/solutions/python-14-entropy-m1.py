import numpy as np

p = np.array([0.1, 0.9])
cross_entropy = -np.log(p)
squared = (1 - p) ** 2
print(np.round(cross_entropy, 4))
print(np.round(squared, 4))
