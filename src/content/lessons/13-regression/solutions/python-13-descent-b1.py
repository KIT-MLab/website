def f(x):
    return (x - 3) ** 2 + 1

x = float(input())
step_size = float(input())
steps = int(input())
h = 0.0001
for i in range(steps):
    slope = (f(x + h) - f(x)) / h
    x = x - step_size * slope

print(round(x, 4))
print(round(f(x), 4))
