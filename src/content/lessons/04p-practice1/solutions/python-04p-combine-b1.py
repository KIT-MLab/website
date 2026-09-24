count = 0
sale = 0
total = 0
line = input()
while line != "終わり":
    price = int(line)
    total = total + price
    if price >= 1000:
        count = count + 1
    if price >= 800 and price <= 1200:
        sale = sale + 1
    line = input()
print(f"1000円以上 {count}個")
print(f"セール対象 {sale}個")
print(f"合計 {total}円")
