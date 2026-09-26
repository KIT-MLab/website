count = int(input())
scores = []
for i in range(count):
    scores.append(int(input()))

total = 0
for value in scores:
    total = total + value
average = round(total / count, 1)
print(total)
print(average)
