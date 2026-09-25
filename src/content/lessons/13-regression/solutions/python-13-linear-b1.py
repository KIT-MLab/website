import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])

def loss(w):
    pred = hours * w[0] + w[1]
    return np.mean((pred - scores) ** 2)

def grad(w):
    pred = hours * w[0] + w[1]
    return np.array([np.mean(2 * (pred - scores) * hours), np.mean(2 * (pred - scores))])

steps = int(input())
w = np.array([0.0, 0.0])
for i in range(1, steps + 1):
    w = w - 0.02 * grad(w)
    if i % 100 == 0:
        print(i, round(loss(w), 1))

print(np.round(w, 2))
print(round(loss(w), 1))
