import numpy as np

times = np.array([int(input()), int(input()), int(input()), int(input()), int(input())])
average = times.mean()
print(times[times < average])
