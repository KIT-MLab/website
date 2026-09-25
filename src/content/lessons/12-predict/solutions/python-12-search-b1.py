import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0])
scores = np.array([45, 52, 65, 70, 82])

def loss(a, b):
    pred = a * hours + b
    return np.mean((pred - scores) ** 2)

a_min = float(input())
a_max = float(input())
a_num = int(input())
b_min = float(input())
b_max = float(input())
b_num = int(input())

a_candidates = np.linspace(a_min, a_max, a_num)
b_candidates = np.linspace(b_min, b_max, b_num)

best_a = a_candidates[0]
best_b = b_candidates[0]
best_loss = loss(best_a, best_b)
for a in a_candidates:
    for b in b_candidates:
        current = loss(a, b)
        if current < best_loss:
            best_loss = current
            best_a = a
            best_b = b

print(round(best_a, 2))
print(round(best_b, 2))
print(round(best_loss, 2))
