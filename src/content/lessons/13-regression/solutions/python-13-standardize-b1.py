import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
commute = np.array([20, 20, 75, 50, 60, 60, 70, 10, 50, 20, 40, 85, 55, 15, 55, 20, 70, 90, 90, 60, 80, 40, 20, 50, 45, 65, 90, 30, 80, 20])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])

hours_z = (hours - hours.mean()) / hours.std()
commute_z = (commute - commute.mean()) / commute.std()
X = np.array([hours_z, commute_z]).T

steps = int(input())
w = np.array([0.0, 0.0])
b = 0.0
n = len(scores)
for i in range(steps):
    pred = X @ w + b
    w = w - 0.1 * (X.T @ (pred - scores) * 2 / n)
    b = b - 0.1 * np.mean(2 * (pred - scores))

print(np.round(w, 2))
print(round(b, 2))
print(round(np.mean((X @ w + b - scores) ** 2), 2))
