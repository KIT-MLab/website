import numpy as np

m1 = int(input())
m2 = int(input())
m3 = int(input())
m4 = int(input())
a1 = int(input())
a2 = int(input())
a3 = int(input())
a4 = int(input())
morning = np.array([m1, m2, m3, m4])
afternoon = np.array([a1, a2, a3, a4])
print(morning + afternoon)
