def f(x):
    return x ** 2 - 4 * x + 5

x0 = 3
h = 0.0001
slope = (f(x0 + h) - f(x0)) / h
print(round(slope, 4))

if slope > 0:
    print("左へ動かす")
else:
    print("右へ動かす")
