import numpy as np

k = int(input())
steps = np.array([int(input()), int(input()), int(input()), int(input()), int(input()), int(input())])
front = steps[:k]
print(front[front > steps.mean()])
