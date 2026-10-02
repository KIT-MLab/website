import numpy as np

hours = np.array([2, 3, 5, 6, 8])
scores = np.array([45, 52, 65, 70, 82])

def mse(pred, actual):
    return np.mean((pred - actual) ** 2)

a = float(input())
b = float(input())
pred = a * hours + b
print(round(mse(pred, scores), 2))
