prices = [int(input()), int(input()), int(input()), int(input())]
for price in prices:
    if price >= 1000:
        print(price - 100)
    else:
        print(price)
