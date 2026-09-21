count = int(input())
threshold = 60
for i in range(count):
    scores = [int(input()), int(input()), int(input())]
    average = (scores[0] + scores[1] + scores[2]) / 3
    if average >= threshold:
        print(f"平均{round(average, 1)}点 合格")
    else:
        print(f"平均{round(average, 1)}点 不合格")
