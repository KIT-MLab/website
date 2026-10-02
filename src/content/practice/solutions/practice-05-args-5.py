def points(amount, bonus=1):
    return amount // 100 * bonus

n = int(input())
for i in range(n):
    day = int(input())
    amount = int(input())
    if day % 5 == 0:
        earned = points(amount, 2)
    else:
        earned = points(amount)
    print(f"{day}日: {earned}ポイント")
