import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

n = int(input())
z = []
for i in range(n):
    z.append(float(input()))
z = np.array(z)

p = sigmoid(z)
pred = (p >= 0.5) * 1
print(np.round(p, 4))
print(pred)
