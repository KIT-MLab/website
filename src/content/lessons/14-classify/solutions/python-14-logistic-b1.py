import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0])
sleep = np.array([6.5, 7.0, 6.0, 6.5, 7.0])
X = np.array([hours, sleep]).T
passed = np.array([0, 0, 1, 1, 1])

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

steps = int(input())
w = np.array([0.0, 0.0])
b = 0.0
print(round(loss(w, b), 3))
for i in range(steps):
    gw = grad_w(w, b)
    gb = grad_b(w, b)
    w = w - 0.01 * gw
    b = b - 0.01 * gb
print(round(loss(w, b), 3))
