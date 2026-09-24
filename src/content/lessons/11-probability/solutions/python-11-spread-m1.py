import numpy as np

class_a = np.array([70, 70, 70, 70])
class_b = np.array([60, 70, 70, 80])
print(class_a.mean(), class_b.mean())

variance = np.mean((class_b - class_b.mean()) ** 2)
print(round(variance, 1))
print(round(np.var(class_b), 1))
print(round(np.std(class_b), 1))
