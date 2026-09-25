import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])
passed = (scores >= 60) * 1

a = 0.0
b = 0.0
for i in range(500):
    z = a * hours + b
    a = a - 0.01 * np.mean(2 * (z - passed) * hours)
    b = b - 0.01 * np.mean(2 * (z - passed))

z = a * hours + b
print(round(z.min(), 2), round(z.max(), 2))
