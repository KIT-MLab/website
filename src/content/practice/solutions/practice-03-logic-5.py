score = int(input())
absences = int(input())
if absences >= 4 or score < 40:
    print("不合格")
elif score >= 80 and absences == 0:
    print("優秀")
elif score >= 60:
    print("合格")
else:
    print("追試")
