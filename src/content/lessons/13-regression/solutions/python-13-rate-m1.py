def f(x):
    return (x - 3) ** 2 + 1

h = 0.0001
for lr in [0.05, 0.3, 0.4]:
    x = 0
    for i in range(20):
        slope = (f(x + h) - f(x)) / h
        x = x - lr * slope
    print(round(x, 4), round(f(x), 4))
