import numpy as np

hours = np.array([2, 3, 5, 6, 8])
scores = np.array([45, 52, 65, 70, 82])

def loss(a, b):
    pred = a * hours + b
    return np.sum((pred - scores) ** 2)

a = int(input())
b = int(input())
h = 0.0001
slope_a = (loss(a + h, b) - loss(a, b)) / h
slope_b = (loss(a, b + h) - loss(a, b)) / h
print(round(slope_a, 1))
print(round(slope_b, 1))
