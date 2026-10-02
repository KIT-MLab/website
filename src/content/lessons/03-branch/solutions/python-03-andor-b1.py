age = int(input())
if age < 6 or age >= 65:
    print("無料です")
elif age >= 13 and age <= 18:
    print("学生料金です")
else:
    print("通常料金です")
