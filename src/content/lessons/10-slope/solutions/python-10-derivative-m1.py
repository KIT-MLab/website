def f(x):
    return x ** 2

x0 = 6
h = 0.001
print(round((f(x0 + h) - f(x0)) / h, 2))
