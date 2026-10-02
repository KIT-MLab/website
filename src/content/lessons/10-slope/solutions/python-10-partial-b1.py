def f(a, b):
    return a ** 2 + a * b + 2 * b ** 2

a = int(input())
b = int(input())
h = 0.0001
slope_a = (f(a + h, b) - f(a, b)) / h
slope_b = (f(a, b + h) - f(a, b)) / h
print(round(slope_a, 1))
print(round(slope_b, 1))
