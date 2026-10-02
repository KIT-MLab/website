hours = []
for i in range(7):
    hours.append(int(input()))
first = int(input())
last = int(input())
total = 0
for i in range(first - 1, last):
    total = total + hours[i]
print(total)
