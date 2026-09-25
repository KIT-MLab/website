import numpy as np

hours = np.array([2.0, 3.0, 5.0, 6.0, 8.0, 9.0, 6.0, 6.5, 8.5, 5.5, 7.0, 8.0, 2.5, 0.5, 3.0, 3.0, 8.0, 8.5, 0.5, 4.5, 7.5, 1.5, 7.5, 1.5, 4.5, 7.5, 3.0, 3.5, 3.0, 6.5])
scores = np.array([45, 52, 65, 70, 82, 84, 63, 70, 85, 68, 70, 80, 44, 39, 62, 52, 85, 91, 33, 66, 80, 39, 77, 39, 72, 73, 52, 50, 49, 77])

def loss(a, b):
    pred = a * hours + b
    return np.mean((pred - scores) ** 2)

a_candidates = np.linspace(5.0, 7.0, 21)
b_candidates = np.linspace(30.0, 36.0, 61)

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

n = int(input())
for i in range(n):
    new_hours = float(input())
    print(round(best_a * new_hours + best_b, 1))
