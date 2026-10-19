import numpy as np

w1 = int(input())
w2 = int(input())
w3 = int(input())
h1 = int(input())
h2 = int(input())
h3 = int(input())
widths = np.array([w1, w2, w3])
heights = np.array([h1, h2, h3])
print(widths * heights)
print((widths + heights) * 2)
