import numpy as np

p = np.array([1e-100, 1e-100, 1e-100])

product = 1.0
for x in p:
    product = product * x
print(product)

log_sum = 0.0
for x in p:
    log_sum = log_sum + np.log(x)
print(round(log_sum, 1))
