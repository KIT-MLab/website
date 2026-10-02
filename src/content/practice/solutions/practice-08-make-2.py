import numpy as np

heights = []
for i in range(6):
    heights.append(int(input()))
seats = np.array(heights).reshape(3, 2)
print(seats)
