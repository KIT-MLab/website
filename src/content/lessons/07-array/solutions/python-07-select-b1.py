import numpy as np

s1 = int(input())
s2 = int(input())
s3 = int(input())
s4 = int(input())
s5 = int(input())
scores = np.array([s1, s2, s3, s4, s5])
print(scores[scores > scores.mean()])
