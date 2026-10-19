import numpy as np

t1 = int(input())
t2 = int(input())
t3 = int(input())
t4 = int(input())
t5 = int(input())
times = np.array([t1, t2, t3, t4, t5])
average = times.mean()
print(times[times < average])
