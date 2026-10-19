import numpy as np

p1 = int(input())
p2 = int(input())
p3 = int(input())
a1 = int(input())
a2 = int(input())
a3 = int(input())
predicted = np.array([p1, p2, p3])
actual = np.array([a1, a2, a3])
squared = (predicted - actual) ** 2
print(squared.sum())
