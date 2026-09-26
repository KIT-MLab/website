amount = int(input())
coins500 = amount // 500
rest = amount % 500
coins100 = rest // 100
print(coins500)
print(coins100)
print(rest % 100)
