def f(x):
    return (x - 3) ** 2 + 1

x = 0
h = 0.0001
steps = 3
for i in range(steps):
    slope = (f(x + h) - f(x)) / h
    x = x - 0.3 * slope

print(round(x, 4))
print(round(f(x), 4))
