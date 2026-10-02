count = int(input())
total = 0
for i in range(count):
    total = total + int(input())
print(total)
print(round(total / count, 1))
