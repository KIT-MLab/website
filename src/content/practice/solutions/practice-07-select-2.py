import numpy as np

p1 = int(input())
p2 = int(input())
p3 = int(input())
p4 = int(input())
p5 = int(input())
profits = np.array([p1, p2, p3, p4, p5])
print(profits[profits < 0])
