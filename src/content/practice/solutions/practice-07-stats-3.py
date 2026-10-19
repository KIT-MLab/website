import numpy as np

p1 = int(input())
p2 = int(input())
p3 = int(input())
p4 = int(input())
pages = np.array([p1, p2, p3, p4])
total = pages.sum()
print(total)
print(300 - total)
