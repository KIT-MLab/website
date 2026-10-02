amount = int(input())
n = int(input())
for k in range(1, n + 1):
    print(f"{k}人 {amount // k}円")
