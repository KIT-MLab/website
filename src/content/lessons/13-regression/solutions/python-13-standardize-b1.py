import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
commute = np.array([20.0, 20.0, 75.0, 50.0, 60.0, 60.0, 70.0, 10.0, 50.0, 20.0, 40.0, 85.0, 55.0, 15.0, 55.0, 20.0, 70.0, 90.0, 90.0, 60.0, 80.0, 40.0, 20.0, 50.0, 45.0, 65.0, 90.0, 30.0, 80.0, 20.0])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])

h_mean = hours.mean()
h_std = hours.std()
c_mean = commute.mean()
c_std = commute.std()
X = np.array([(hours - h_mean) / h_std, (commute - c_mean) / c_std]).T

def loss(w, b):
    pred = X @ w + b
    return np.mean((pred - scores) ** 2)

def grad_w(w, b):
    pred = X @ w + b
    n = len(scores)
    return X.T @ (pred - scores) * 2 / n

def grad_b(w, b):
    pred = X @ w + b
    return np.mean(2 * (pred - scores))

w = np.array([0.0, 0.0])
b = 0.0
for i in range(1000):
    gw = grad_w(w, b)
    gb = grad_b(w, b)
    w = w - 0.1 * gw
    b = b - 0.1 * gb

print(np.round(w, 2))
print(round(b, 2))
print(round(loss(w, b), 2))

n = int(input())
for i in range(n):
    new_hours = float(input())
    new_commute = float(input())
    new_x = np.array([(new_hours - h_mean) / h_std, (new_commute - c_mean) / c_std])
    print(round(new_x @ w + b, 1))
