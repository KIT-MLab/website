prices = [int(input()), int(input()), int(input()), int(input()), int(input())]
best = 0
for i in range(len(prices)):
    if prices[i] < prices[best]:
        best = i
print(best + 1)
print(prices[best])
