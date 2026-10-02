import numpy as np

profits = np.array([int(input()), int(input()), int(input()), int(input()), int(input())])
print(profits[profits < 0])
