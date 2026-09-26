height = int(input())
age = int(input())
with_guardian = int(input())
if height >= 120 and (age >= 12 or with_guardian == 1):
    print("乗れます")
else:
    print("乗れません")
