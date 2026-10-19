import numpy as np

s1 = int(input())
s2 = int(input())
s3 = int(input())
s4 = int(input())
s5 = int(input())
steps = np.array([s1, s2, s3, s4, s5])
print(steps.max())
print(steps.min())
