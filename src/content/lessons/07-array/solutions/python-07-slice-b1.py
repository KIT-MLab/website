import numpy as np

k = int(input())
scores = np.array([int(input()), int(input()), int(input()), int(input()), int(input()), int(input())])
front = scores[:k]
back = scores[k:]
print(round(front.mean(), 1))
print(round(back.mean(), 1))
