threshold = 60
japanese = int(input())
mathematics = int(input())
english = int(input())
average = (japanese + mathematics + english) / 3
if average >= threshold:
    verdict = "合格"
else:
    verdict = "不合格"
print(f"平均{round(average, 1)}点 {verdict}")
