n = int(input())
scores = []
for i in range(n):
    scores.append(int(input()))
total = 0
for score in scores:
    total = total + score
average = total / n
count = 0
for score in scores:
    if score > average:
        count = count + 1
print(count)
