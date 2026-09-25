import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0])
sleep = np.array([6.5, 7.0, 6.0, 6.5, 7.0])
X = np.array([hours, sleep]).T

def predict(X, w, b):
    return X @ w + b

print(predict(X, np.array([6.0, 2.0]), 20))
