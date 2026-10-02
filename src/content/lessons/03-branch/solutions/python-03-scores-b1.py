threshold = 60
japanese = int(input())
mathematics = int(input())
english = int(input())
average = (japanese + mathematics + english) / 3
if average >= threshold:
    print(f"平均{round(average, 1)}点 合格")
else:
    print(f"平均{round(average, 1)}点 不合格")
