import numpy as np

n = int(input())
seed = int(input())
hours = []
for i in range(n):
    hours.append(float(input()))
hours = np.array(hours)

rng = np.random.default_rng(seed)
idx = rng.permutation(n)
n_train = round(n * 0.8)
train_idx = idx[:n_train]
test_idx = idx[n_train:]
train_hours = hours[train_idx]
test_hours = hours[test_idx]

print(len(train_hours), len(test_hours))
print(train_hours)
print(test_hours)
