def total_score(scores):
    total = 0
    for value in scores:
        total = total + value
    return total


def average_score(scores):
    return round(total_score(scores) / len(scores), 1)


threshold = 60
count = int(input())
for i in range(count):
    scores = [int(input()), int(input()), int(input())]
    average = average_score(scores)
    if average >= threshold:
        print(f"平均{average}点 合格")
    else:
        print(f"平均{average}点 不合格")
