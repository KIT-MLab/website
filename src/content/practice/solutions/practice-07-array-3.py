import numpy as np

c1 = int(input())
c2 = int(input())
c3 = int(input())
c4 = int(input())
celsius = np.array([c1, c2, c3, c4])
fahrenheit = celsius * 9 / 5 + 32
print(fahrenheit)
