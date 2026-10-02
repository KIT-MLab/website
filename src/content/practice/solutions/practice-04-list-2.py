coins = [1, 5, 10, 50, 100, 500]
n = int(input())
for coin in coins:
    print(f"{coin}円玉 {n}枚で {coin * n}円")
