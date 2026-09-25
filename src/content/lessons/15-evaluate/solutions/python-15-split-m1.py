import numpy as np

hours  = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])

rng = np.random.default_rng(9)
idx = rng.permutation(30)
train_idx = idx[:24]
test_idx = idx[24:]

train_hours = hours[train_idx]
train_scores = scores[train_idx]
test_hours = hours[test_idx]
test_scores = scores[test_idx]

a = 0.0
b = 0.0
for i in range(1500):
    z = a * train_hours + b
    a = a - 0.02 * np.mean(2 * (z - train_scores) * train_hours)
    b = b - 0.02 * np.mean(2 * (z - train_scores))

train_loss = np.mean((a * train_hours + b - train_scores) ** 2)
test_loss = np.mean((a * test_hours + b - test_scores) ** 2)
print(round(train_loss, 1))
print(round(test_loss, 1))
