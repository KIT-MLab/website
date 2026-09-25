def f(x):
    return (x - 3) ** 2 + 1

start = f(0)
lrs = [float(input()), float(input()), float(input())]
steps = int(input())
h = 0.0001
for lr in lrs:
    x = 0
    for i in range(steps):
        slope = (f(x + h) - f(x)) / h
        x = x - lr * slope
    if f(x) > start:
        print(lr, "発散")
    else:
        print(lr, round(x, 4), round(f(x), 4))
