apple_price = int(input())
apple_count = int(input())
bread_price = int(input())
bread_count = int(input())
subtotal = apple_price * apple_count + bread_price * bread_count
tax = subtotal * 10 // 100
total = subtotal + tax
point = total // 100
print(f"小計 {subtotal}円")
print(f"消費税 {tax}円")
print(f"合計 {total}円")
print(f"ポイント {point}")
