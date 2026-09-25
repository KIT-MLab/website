import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0])
scores = np.array([45, 52, 65, 70, 82])

def grad(w):
    pred = hours * w[0] + w[1]
    return np.array([np.mean(2 * (pred - scores) * hours), np.mean(2 * (pred - scores))])

w = np.array([0.0, 0.0])
lr = 0.01
w = w - lr * grad(w)
print(np.round(w, 2))
