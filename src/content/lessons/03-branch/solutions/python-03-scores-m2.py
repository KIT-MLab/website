japanese = 60
mathematics = 60
english = 59
threshold = 60
average = (japanese + mathematics + english) / 3
if average >= threshold:
    print(f"平均{round(average, 1)}点 合格")
else:
    print(f"平均{round(average, 1)}点 不合格")
