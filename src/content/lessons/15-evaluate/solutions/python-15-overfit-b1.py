import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])

rng = np.random.default_rng(50)
idx = rng.permutation(30)
train_idx = idx[:6]
test_idx = idx[6:]

n = int(input())
for degree in range(1, n + 1):
    coef = np.polyfit(hours[train_idx], scores[train_idx], degree)
    pred_train = np.polyval(coef, hours[train_idx])
    pred_test = np.polyval(coef, hours[test_idx])
    train_loss = np.mean((pred_train - scores[train_idx]) ** 2)
    test_loss = np.mean((pred_test - scores[test_idx]) ** 2)
    print(degree, round(train_loss, 1), round(test_loss, 1))
