def f(x):
    return x ** 3

x0 = int(input())
h = 0.0001
numeric = (f(x0 + h) - f(x0)) / h
print(round(numeric, 4))
print(round(3 * x0 ** 2, 4))
