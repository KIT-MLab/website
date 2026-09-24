def with_tax(price, rate=0.1):
    return round(price * (1 + rate))

total = 0
line = input()
while line != "終わり":
    price = int(line)
    total = total + with_tax(price)
    line = input()
print(f"合計 {total}円")
