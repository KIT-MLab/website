count = int(input())
scores = []
for i in range(count):
    scores.append(int(input()))

total = 0
for value in scores:
    total = total + value
average = round(total / count, 1)
print(f"平均 {average}点")

above = 0
for value in scores:
    if value > average:
        above = above + 1
print(f"平均超え {above}人")
