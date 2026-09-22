import numpy as np

scores = np.array([int(input()), int(input()), int(input()), int(input()), int(input())])
print(scores[scores > scores.mean()])
