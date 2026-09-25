import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
sleep = np.array([6.5, 7.0, 6.0, 6.5, 7.0, 5.5, 8.5, 6.5, 6.5, 6.5, 7.0, 6.5, 6.5, 8.5, 8.0, 8.0, 7.5, 7.0, 6.0, 8.5, 6.5, 5.0, 8.0, 5.0, 8.0, 7.0, 5.0, 4.5, 6.5, 4.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])
X = np.array([hours, sleep]).T

def predict(X, w, b):
    return X @ w + b

def loss(w, b):
    pred = predict(X, w, b)
    return np.mean((pred - scores) ** 2)

def grad_w(w, b):
    pred = predict(X, w, b)
    n = len(scores)
    return X.T @ (pred - scores) * 2 / n

def grad_b(w, b):
    pred = predict(X, w, b)
    return np.mean(2 * (pred - scores))

steps = int(input())
w = np.array([0.0, 0.0])
b = 0.0
for i in range(steps):
    gw = grad_w(w, b)
    gb = grad_b(w, b)
    w = w - 0.01 * gw
    b = b - 0.01 * gb

print(np.round(w, 2))
print(round(b, 2))
print(round(loss(w, b), 1))
