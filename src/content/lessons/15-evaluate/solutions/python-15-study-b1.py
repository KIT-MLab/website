import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
sleep = np.array([6.5, 7.0, 6.0, 6.5, 7.0, 5.5, 8.5, 6.5, 6.5, 6.5, 7.0, 6.5, 6.5, 8.5, 8.0, 8.0, 7.5, 7.0, 6.0, 8.5, 6.5, 5.0, 8.0, 5.0, 8.0, 7.0, 5.0, 4.5, 6.5, 4.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])
passed = (scores >= 60) * 1

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def grad_w(X, y, w, b):
    p = sigmoid(X @ w + b)
    return X.T @ (p - y) / len(y)

def grad_b(X, y, w, b):
    p = sigmoid(X @ w + b)
    return np.mean(p - y)

seed = int(input())
rng = np.random.default_rng(seed)
idx = rng.permutation(30)
train_idx = idx[:24]
test_idx = idx[24:]

h_mean = hours[train_idx].mean()
h_std = hours[train_idx].std()
s_mean = sleep[train_idx].mean()
s_std = sleep[train_idx].std()

X_train = np.array([(hours[train_idx] - h_mean) / h_std, (sleep[train_idx] - s_mean) / s_std]).T
X_test = np.array([(hours[test_idx] - h_mean) / h_std, (sleep[test_idx] - s_mean) / s_std]).T
y_train = passed[train_idx]
y_test = passed[test_idx]

w = np.array([0.0, 0.0])
b = 0.0
for i in range(300):
    gw = grad_w(X_train, y_train, w, b)
    gb = grad_b(X_train, y_train, w, b)
    w = w - 0.5 * gw
    b = b - 0.5 * gb

pred_test = (sigmoid(X_test @ w + b) >= 0.5) * 1

accuracy = (pred_test == y_test).mean()
ones = y_test.sum()
zeros = len(y_test) - ones
if ones >= zeros:
    baseline = ones / len(y_test)
else:
    baseline = zeros / len(y_test)

hit = np.sum((pred_test == 1) & (y_test == 1))
miss = np.sum((pred_test == 0) & (y_test == 1))
false_alarm = np.sum((pred_test == 1) & (y_test == 0))
correct_reject = np.sum((pred_test == 0) & (y_test == 0))

print(round(accuracy, 2))
print(round(baseline, 2))
print(hit, miss, false_alarm, correct_reject)
