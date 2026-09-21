def show_average(a, b):
    print(f"平均{(a + b) / 2}")

count = int(input())
for i in range(count):
    a = int(input())
    b = int(input())
    show_average(a, b)
