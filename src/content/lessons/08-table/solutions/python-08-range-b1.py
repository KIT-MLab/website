import numpy as np

start = float(input())
stop = float(input())
step = float(input())
x = np.arange(start, stop, step)
print(x)
print(x ** 2)
