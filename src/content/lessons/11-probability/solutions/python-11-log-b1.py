import numpy as np

n = int(input())
values = []
for i in range(n):
    values.append(float(input()))
p = np.array(values)

product = 1.0
for x in p:
    product = product * x
print(round(product, 6))

log_sum = 0.0
for x in p:
    log_sum = log_sum + np.log(x)
print(round(log_sum, 1))
