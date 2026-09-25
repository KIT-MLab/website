import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
sleep = np.array([6.5, 7.0, 6.0, 6.5, 7.0, 5.5, 8.5, 6.5, 6.5, 6.5, 7.0, 6.5, 6.5, 8.5, 8.0, 8.0, 7.5, 7.0, 6.0, 8.5, 6.5, 5.0, 8.0, 5.0, 8.0, 7.0, 5.0, 4.5, 6.5, 4.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])
passed = (scores >= 60) * 1

h_mean = hours.mean()
h_std = hours.std()
s_mean = sleep.mean()
s_std = sleep.std()
X = np.array([(hours - h_mean) / h_std, (sleep - s_mean) / s_std]).T

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def loss(w, b):
    p = sigmoid(X @ w + b)
    return np.mean(-(passed * np.log(p) + (1 - passed) * np.log(1 - p)))

def grad_w(w, b):
    p = sigmoid(X @ w + b)
    return X.T @ (p - passed) / len(passed)

def grad_b(w, b):
    p = sigmoid(X @ w + b)
    return np.mean(p - passed)

w = np.array([0.0, 0.0])
b = 0.0
print(round(loss(w, b), 3))

for i in range(300):
    gw = grad_w(w, b)
    gb = grad_b(w, b)
    w = w - 0.5 * gw
    b = b - 0.5 * gb

print(round(loss(w, b), 3))
print(np.round(w, 2))
print(round(b, 2))

n = int(input())
for i in range(n):
    new_hours = float(input())
    new_sleep = float(input())
    new_x = np.array([(new_hours - h_mean) / h_std, (new_sleep - s_mean) / s_std])
    p = sigmoid(new_x @ w + b)
    if p >= 0.5:
        print(f"確率{round(p, 2)} 合格")
    else:
        print(f"確率{round(p, 2)} 不合格")
