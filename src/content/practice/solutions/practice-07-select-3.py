import numpy as np

a1 = int(input())
a2 = int(input())
a3 = int(input())
a4 = int(input())
a5 = int(input())
amounts = np.array([a1, a2, a3, a4, a5])
print(amounts[amounts >= 1000].sum())
