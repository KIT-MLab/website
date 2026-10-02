n = int(input())
for i in range(1, n + 1):
    if i % 10 == 0:
        print(f"{i}回目 割引券")
    elif i % 5 == 0:
        print(f"{i}回目 ボーナス")
    else:
        print(f"{i}回目")
