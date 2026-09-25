import numpy as np

passed = np.array([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
pred = np.array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1])

accuracy = (pred == passed).mean()
ones = passed.sum()
zeros = len(passed) - ones
if ones >= zeros:
    baseline = ones / len(passed)
else:
    baseline = zeros / len(passed)

print(round(accuracy, 2))
print(round(baseline, 2))
