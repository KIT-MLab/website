price = int(input())
count = int(input())
total = price * count
if total >= 10000:
    fee = 0
elif total >= 5000:
    fee = 300
else:
    fee = 600
print(fee)
print(total + fee)
