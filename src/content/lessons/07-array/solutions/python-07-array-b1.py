import numpy as np

predicted = np.array([int(input()), int(input()), int(input())])
actual = np.array([int(input()), int(input()), int(input())])
diff = predicted - actual
print((diff ** 2).sum())
