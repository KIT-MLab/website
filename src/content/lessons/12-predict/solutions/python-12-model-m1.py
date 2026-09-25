import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0])

def predict(hours, a, b):
    return a * hours + b

print(predict(hours, 5, 30))
