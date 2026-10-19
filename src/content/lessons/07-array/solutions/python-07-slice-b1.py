import numpy as np

k = int(input())
s1 = int(input())
s2 = int(input())
s3 = int(input())
s4 = int(input())
s5 = int(input())
s6 = int(input())
scores = np.array([s1, s2, s3, s4, s5, s6])
front = scores[:k]
back = scores[k:]
print(round(front.mean(), 1))
print(round(back.mean(), 1))
