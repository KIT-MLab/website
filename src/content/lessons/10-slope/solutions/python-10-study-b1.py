import numpy as np

hours = np.array([2, 3, 5, 6, 8])
scores = np.array([45, 52, 65, 70, 82])

def loss(a, b):
    pred = a * hours + b
    return np.sum((pred - scores) ** 2)

a = int(input())
b = int(input())
h = 0.0001
current = loss(a, b)
slope_a = (loss(a + h, b) - current) / h
slope_b = (loss(a, b + h) - current) / h
print(current)
print(round(slope_a, 1))
print(round(slope_b, 1))
if slope_a > 0:
    print("aを減らす")
else:
    print("aを増やす")
if slope_b > 0:
    print("bを減らす")
else:
    print("bを増やす")
