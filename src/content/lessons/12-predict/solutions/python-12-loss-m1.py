import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0])
scores = np.array([45, 52, 65, 70, 82])

def mse(pred, actual):
    return np.mean((pred - actual) ** 2)

a = 8
b = 22
pred = a * hours + b
print(round(mse(pred, scores), 1))
