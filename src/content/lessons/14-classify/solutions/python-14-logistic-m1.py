import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0])
sleep = np.array([6.5, 7.0, 6.0, 6.5, 7.0])
X = np.array([hours, sleep]).T
passed = np.array([0, 0, 1, 1, 1])

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def grad_w(w, b):
    p = sigmoid(X @ w + b)
    return X.T @ (p - passed) / len(passed)

def grad_b(w, b):
    p = sigmoid(X @ w + b)
    return np.mean(p - passed)

w = np.array([0.0, 0.0])
b = 0.0
lr = 0.5
gw = grad_w(w, b)
gb = grad_b(w, b)
w = w - lr * gw
b = b - lr * gb
print(np.round(w, 2))
print(round(b, 2))
